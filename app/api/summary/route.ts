// app/api/summary/route.ts
// 结果卡：把这桌讨论压成「讨论地图 + 灵魂金句」。
//
// 合并记录（三条实现线取长补短）：
// - 架构采用队长版，理由（按重要性排序）：
//   1) 隐私：只把**粗粒度的可分享状态**喂给模型，用户的追问、补充条件、
//      离桌文字一律不进 prompt —— 那些可能含私密信息，不能进可分享的结果卡。
//   2) 第三席规则在解析后强制：prompt 指令不是安全边界，未邀请的第三席
//      不会因为模型自由发挥就出现在结果卡里。
//   3) mode 诚实：fallback / retrieval / generated 三态各有明确触发条件，
//      不把"只检索未生成"伪装成最终答案。
// - LLM 调用改走本分支的统一 callLLM，固化 thinking=disabled。
//   队长原实现直接调 client.chat.completions.create 且不传 thinking，
//   会跑在 DeepSeek 默认思考模式下（实测 9.1s / 1832 思维链 token）。
// - 增加本分支的 guard 清洗：进 prompt 之前先去掉控制字符与注入载荷。

import { NextResponse } from "next/server";

import { getSummaryFallback } from "@/lib/fallback";
import { embedQuery, retrieveFromTopics, loadTopics } from "@/lib/rag";
import { callLLMJson } from "@/lib/ai/llm";
import { makeRequestMeta } from "@/lib/session/rag";
import { sanitizeText } from "@/lib/session/guard";
import { discussionMapSchema, summaryRequestSchema } from "@/lib/validators";
import type {
  DiscussionMap,
  FirstChoice,
  PositionChange,
  SecondChoice,
  SeatId,
  SourceReference,
  SummaryResult,
} from "@/lib/types";

const labels = {
  first: { support_quit: "更接近第一席", oppose_quit: "更接近第二席", depends: "暂时无法判断" },
  second: { leave_now: "选择先离开", wait_offer: "选择先等下家", set_deadline: "选择设定边界" },
  change: { unchanged: "核心立场保持不变", slightly_changed: "保留原方向并补充条件", changed: "主要判断发生变化" },
} as const;

/**
 * 第三席只有在"明确邀请"且有已生成的视角名称时才算真正入桌。
 * 请求体本身来自客户端，不能仅相信 thirdSeatInvited 这个布尔值。
 */
function hasInvitedThirdSeat(input: { thirdSeatInvited?: boolean; perspectiveName?: string }): boolean {
  return input.thirdSeatInvited === true && Boolean(input.perspectiveName?.trim());
}

function buildDiscussionMap(
  input: { tendency?: string; secondChoice: SecondChoice; thirdSeatInvited?: boolean; perspectiveName?: string },
  topicTitle: string,
): DiscussionMap {
  const thirdSeatInvited = hasInvitedThirdSeat(input);
  const ripples: DiscussionMap["ripples"] = [
    { label: "健康与现金", type: "conflict", sourceSeat: "action" },
    { label: "安全线在哪", type: "premise", sourceSeat: "realist" },
  ];
  ripples.push(
    thirdSeatInvited
      ? { label: "保留选择权", type: "perspective", sourceSeat: "conditional" }
      : { label: "仍需确认", type: "premise" },
  );
  const start: DiscussionMap["trajectory"]["start"] =
    input.tendency === "closer_first" ? "action" : input.tendency === "closer_second" ? "realist" : "undecided";
  const end: DiscussionMap["trajectory"]["end"] = thirdSeatInvited
    ? "conditional"
    : input.secondChoice === "leave_now"
      ? "action"
      : input.secondChoice === "wait_offer"
        ? "realist"
        : "undecided";
  const checkpoints: DiscussionMap["trajectory"]["checkpoints"] = ["collision"];
  if (thirdSeatInvited) checkpoints.push("conditional");
  const normalizedTitle = topicTitle.trim() === "裸辞" ? "年轻人该不该裸辞" : topicTitle.trim();
  const question = /[？?。！!]$/.test(normalizedTitle) ? normalizedTitle : `${normalizedTitle}？`;
  return { question, ripples: ripples.slice(0, 3), trajectory: { start, checkpoints, end } };
}

function buildSoulSentence(input: {
  secondChoice: SecondChoice;
  confirmedDivergence?: string;
  exitUnderstanding?: string;
  thirdSeatInvited?: boolean;
}): string {
  // 离桌表达会参与语义判断，但不逐字进入可分享金句，避免把用户可能
  // 填入的私密补充直接带进系统分享面板。
  const departureMentionsLoss = /损失|代价|健康|现金|风险/.test(input.exitUnderstanding ?? "");
  if (departureMentionsLoss) return "你不是在选辞不辞，而是在选哪种代价更能承受。";
  if (input.confirmedDivergence?.includes("损失")) return "你不是在选辞不辞，而是在选哪种代价更能承受。";
  if (input.thirdSeatInvited) return "把不可逆的代价看清，才知道下一步要保留什么。";
  if (input.secondChoice === "wait_offer") return "等待不是没有代价，而是把安全线说清楚再走。";
  if (input.secondChoice === "leave_now") return "离开可以止损，但也要给生活留出可回头的空间。";
  return "先把条件和期限写下来，判断就不必停在一句'看情况'。";
}

function buildThoughtTrail(input: ReturnType<typeof summaryRequestSchema.parse>, topicTitle: string) {
  const tendencyLabel =
    input.tendency === "closer_first"
      ? labels.first.support_quit
      : input.tendency === "closer_second"
        ? labels.first.oppose_quit
        : labels.first.depends;
  return {
    tendency: `最初，你${tendencyLabel}。`,
    collisionPoint: `你选中了「${input.collisionPoint ?? "尚未记录具体碰撞点"}」。`,
    challenge: `带来动摇的质疑：${input.challenge ?? "质疑尚未记录"}`,
    response: `原席位的回应：${input.response ?? "回应尚未记录"}`,
    turningPoint: `这次互质让「${topicTitle}」从立场选择变成了对条件、代价和时间点的判断。`,
    confirmedDivergence: `你确认的隐藏分歧：${input.confirmedDivergence ?? "尚未确认"}`,
    perspective: hasInvitedThirdSeat(input)
      ? `第三知识视角：${input.perspectiveName}`
      : "第三席未正式入桌，本卡保留未解问题。",
    departure: "离桌时，你不必立刻决定裸辞；你已经知道下一次要观察什么信号、保护什么底线。",
  };
}

function normalizeSources(
  results: Array<{ seat: SeatId; top: Awaited<ReturnType<typeof retrieveFromTopics>> }>,
): SourceReference[] {
  const seen = new Set<string>();
  const refs: SourceReference[] = [];
  for (const result of results)
    for (const source of result.top) {
      if (seen.has(source.contentId)) continue;
      seen.add(source.contentId);
      refs.push({
        id: source.contentId,
        seatId: result.seat,
        title: source.title,
        url: source.url,
        author: source.author,
        kind: "knowledge",
      });
    }
  return refs;
}

/**
 * 用模型细化讨论地图与灵魂金句。
 * 失败（无配置 / 超时 / JSON 不合法 / 校验不过）一律返回 null，由调用方降级。
 */
async function generateWithModel(
  input: ReturnType<typeof summaryRequestSchema.parse>,
  topicTitle: string,
  base: SummaryResult,
): Promise<SummaryResult | null> {
  const thirdSeatInvited = hasInvitedThirdSeat(input);
  // 只把粗粒度、可分享的路径状态交给最终卡片生成器。
  // 用户追问、补充条件与离桌文字可能含私密信息，绝不能复制进可分享的卡片。
  const shareSafePath = {
    firstChoice: input.firstChoice,
    secondChoice: input.secondChoice,
    positionChange: input.positionChange,
    tendency: input.tendency,
    thirdSeatInvited,
    perspectiveName: thirdSeatInvited ? input.perspectiveName : undefined,
    hasConfirmedDivergence: Boolean(input.confirmedDivergence),
    hasDepartureReflection: Boolean(input.exitUnderstanding),
  };

  const result = await callLLMJson({
    system: "你是知识拼桌主持人。不要评价对错，不替用户做决定，不编造事实。",
    user: `固定话题：${topicTitle}
可分享的路径状态：${JSON.stringify(shareSafePath)}
已有地图：${JSON.stringify(base.discussionMap)}
返回 JSON：{discussionMap:{question,ripples,trajectory},soulSentence}。ripples 最多 3 项且每个 label 2—8 个汉字；soulSentence 不超过 40 字；不要臆测用户心理，不要把未邀请的第三席写成既成事实。`,
    temperature: 0.25,
    // 非思考模式：结果卡是结构化输出（问题+3 标签+金句），无需思维链
    thinking: "disabled",
    maxTokens: 900,
    label: "summary",
    parse: (raw) => {
      const parsed = raw as { discussionMap?: unknown; soulSentence?: unknown };
      const checkedMap = discussionMapSchema.safeParse(parsed.discussionMap);
      if (!checkedMap.success) throw new Error("discussionMap 校验失败");
      if (typeof parsed.soulSentence !== "string" || parsed.soulSentence.length === 0) {
        throw new Error("soulSentence 缺失");
      }
      return { map: checkedMap.data, soulSentence: parsed.soulSentence };
    },
  });

  if (!result) return null;

  const generatedMap = result.map;
  // prompt 指令不是安全边界。解析后再强制一次第三席规则，
  // 未邀请的第三视角不会作为"已完成的回合"出现在结果卡里。
  const discussionMap: DiscussionMap = thirdSeatInvited
    ? generatedMap
    : {
        ...generatedMap,
        ripples: generatedMap.ripples
          .filter((ripple) => ripple.sourceSeat !== "conditional")
          .map((ripple) => (ripple.type === "perspective" ? { ...ripple, type: "premise" as const } : ripple))
          .slice(0, 3),
        trajectory: {
          start:
            generatedMap.trajectory.start === "conditional"
              ? base.discussionMap!.trajectory.start
              : generatedMap.trajectory.start,
          checkpoints: generatedMap.trajectory.checkpoints.filter((checkpoint) => checkpoint !== "conditional"),
          end:
            generatedMap.trajectory.end === "conditional"
              ? base.discussionMap!.trajectory.end
              : generatedMap.trajectory.end,
        },
      };

  return {
    ...base,
    discussionMap,
    soulSentence: result.soulSentence.slice(0, 40),
    mode: "generated",
  };
}

export async function POST(request: Request) {
  let parsed: ReturnType<typeof summaryRequestSchema.parse>;
  try {
    parsed = summaryRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const topics = await loadTopics();
  const currentTopic = topics[parsed.topicId];
  if (!currentTopic) return NextResponse.json({ error: `话题 ${parsed.topicId} 不存在` }, { status: 404 });

  // guard：进 prompt 之前先洗掉控制字符与注入载荷
  const input: typeof parsed = {
    ...parsed,
    collisionPoint: parsed.collisionPoint ? sanitizeText(parsed.collisionPoint) : undefined,
    challenge: parsed.challenge ? sanitizeText(parsed.challenge) : undefined,
    response: parsed.response ? sanitizeText(parsed.response) : undefined,
    confirmedDivergence: parsed.confirmedDivergence ? sanitizeText(parsed.confirmedDivergence) : undefined,
    exitUnderstanding: parsed.exitUnderstanding ? sanitizeText(parsed.exitUnderstanding) : undefined,
    firstSeatStatement: parsed.firstSeatStatement ? sanitizeText(parsed.firstSeatStatement) : undefined,
    secondSeatStatement: parsed.secondSeatStatement ? sanitizeText(parsed.secondSeatStatement) : undefined,
  };

  const meta = makeRequestMeta(input, input.topicId);
  const firstChoice = (input.firstChoice ??
    (input.tendency === "closer_first"
      ? "support_quit"
      : input.tendency === "closer_second"
        ? "oppose_quit"
        : "depends")) as FirstChoice;
  const secondChoice = (input.secondChoice ?? "set_deadline") as SecondChoice;
  const positionChange = (input.positionChange ?? "slightly_changed") as PositionChange;
  const thirdSeatInvited = hasInvitedThirdSeat(input);
  const fallback = getSummaryFallback(firstChoice, secondChoice, positionChange);
  const base: SummaryResult = {
    ...fallback,
    ...meta,
    discussionMap: buildDiscussionMap(
      {
        tendency: input.tendency,
        secondChoice,
        thirdSeatInvited,
        perspectiveName: thirdSeatInvited ? input.perspectiveName : undefined,
      },
      currentTopic.title,
    ),
    soulSentence: buildSoulSentence({
      secondChoice,
      confirmedDivergence: input.confirmedDivergence,
      exitUnderstanding: input.exitUnderstanding,
      thirdSeatInvited,
    }),
    sources: [],
    mode: "fallback",
  };
  if (input.flow === "knowledge-table-v2") base.thoughtTrail = buildThoughtTrail(input, currentTopic.title);

  let queryVec: number[] | null = null;
  try {
    queryVec = await embedQuery(`${currentTopic.title} ${firstChoice} ${secondChoice} ${input.confirmedDivergence ?? ""}`);
  } catch {
    queryVec = null;
  }
  // 只暴露真正参与本桌的席位的证据。
  const seats: SeatId[] = thirdSeatInvited ? ["conditional", "realist", "action"] : ["realist", "action"];
  const results = await Promise.all(
    seats.map(async (seat) => ({
      seat,
      top: await retrieveFromTopics(queryVec, { topicId: input.topicId, seat }, 1, {
        query: `${currentTopic.title} ${input.collisionPoint ?? ""}`,
      }),
    })),
  );
  const sources = normalizeSources(results);
  if (sources.length === 0) return NextResponse.json(base);

  const retrievalBase: SummaryResult = {
    ...base,
    sourceIds: sources.map((source) => source.id),
    sourceUrls: sources.map((source) => source.url ?? ""),
    authors: sources.map((source) => source.author ?? ""),
    sources,
    mode: "retrieval",
  };

  const generated = await generateWithModel(input, currentTopic.title, retrievalBase);
  // 配置了 API 但生成失败时，保留检索证据并显式降级为 fallback，
  // 避免把"只检索、未生成"伪装成最终答案。
  return NextResponse.json(generated ?? { ...retrievalBase, mode: "fallback" });
}
