import { NextResponse } from "next/server";

import { getAIClient, AI_MODEL } from "@/lib/ai";
import { getSummaryFallback } from "@/lib/fallback";
import { embedQuery, retrieveFromTopics, loadTopics } from "@/lib/rag";
import { makeRequestMeta } from "@/lib/session/rag";
import { discussionMapSchema, parseModelJson, summaryRequestSchema } from "@/lib/validators";
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
 * 第三席只有在“明确邀请”且有已生成的视角名称时才算真正入桌。
 * 请求体本身来自客户端，不能仅相信 thirdSeatInvited 这个布尔值。
 */
function hasInvitedThirdSeat(input: { thirdSeatInvited?: boolean; perspectiveName?: string }): boolean {
  return input.thirdSeatInvited === true && Boolean(input.perspectiveName?.trim());
}

function buildDiscussionMap(input: { tendency?: string; secondChoice: SecondChoice; thirdSeatInvited?: boolean; perspectiveName?: string }, topicTitle: string): DiscussionMap {
  const thirdSeatInvited = hasInvitedThirdSeat(input);
  const ripples: DiscussionMap["ripples"] = [
    { label: "健康与现金", type: "conflict", sourceSeat: "action" },
    { label: "安全线在哪", type: "premise", sourceSeat: "realist" },
  ];
  ripples.push(thirdSeatInvited
    ? { label: "保留选择权", type: "perspective", sourceSeat: "conditional" }
    : { label: "仍需确认", type: "premise" });
  const start: DiscussionMap["trajectory"]["start"] = input.tendency === "closer_first" ? "action" : input.tendency === "closer_second" ? "realist" : "undecided";
  const end: DiscussionMap["trajectory"]["end"] = thirdSeatInvited ? "conditional" : input.secondChoice === "leave_now" ? "action" : input.secondChoice === "wait_offer" ? "realist" : "undecided";
  const checkpoints: DiscussionMap["trajectory"]["checkpoints"] = ["collision"];
  if (thirdSeatInvited) checkpoints.push("conditional");
  const normalizedTitle = topicTitle.trim() === "裸辞" ? "年轻人该不该裸辞" : topicTitle.trim();
  const question = /[？?。！!]$/.test(normalizedTitle) ? normalizedTitle : `${normalizedTitle}？`;
  return { question, ripples: ripples.slice(0, 3), trajectory: { start, checkpoints, end } };
}

function buildSoulSentence(input: { secondChoice: SecondChoice; confirmedDivergence?: string; exitUnderstanding?: string; thirdSeatInvited?: boolean }): string {
  // 离桌表达会参与语义判断，但不逐字进入可分享金句，避免把用户可能
  // 填入的私密补充直接带进系统分享面板。
  const departureMentionsLoss = /损失|代价|健康|现金|风险/.test(input.exitUnderstanding ?? "");
  if (departureMentionsLoss) return "你不是在选辞不辞，而是在选哪种代价更能承受。";
  if (input.confirmedDivergence?.includes("损失")) return "你不是在选辞不辞，而是在选哪种代价更能承受。";
  if (input.thirdSeatInvited) return "把不可逆的代价看清，才知道下一步要保留什么。";
  if (input.secondChoice === "wait_offer") return "等待不是没有代价，而是把安全线说清楚再走。";
  if (input.secondChoice === "leave_now") return "离开可以止损，但也要给生活留出可回头的空间。";
  return "先把条件和期限写下来，判断就不必停在一句‘看情况’。";
}

function buildThoughtTrail(input: ReturnType<typeof summaryRequestSchema.parse>, topicTitle: string) {
  const tendencyLabel = input.tendency === "closer_first" ? labels.first.support_quit : input.tendency === "closer_second" ? labels.first.oppose_quit : labels.first.depends;
  return {
    tendency: `最初，你${tendencyLabel}。`,
    collisionPoint: `你选中了「${input.collisionPoint ?? "尚未记录具体碰撞点"}」。`,
    challenge: `带来动摇的质疑：${input.challenge ?? "质疑尚未记录"}`,
    response: `原席位的回应：${input.response ?? "回应尚未记录"}`,
    turningPoint: `这次互质让「${topicTitle}」从立场选择变成了对条件、代价和时间点的判断。`,
    confirmedDivergence: `你确认的隐藏分歧：${input.confirmedDivergence ?? "尚未确认"}`,
    perspective: hasInvitedThirdSeat(input) ? `第三知识视角：${input.perspectiveName}` : "第三席未正式入桌，本卡保留未解问题。",
    departure: "离桌时，你不必立刻决定裸辞；你已经知道下一次要观察什么信号、保护什么底线。",
  };
}

function normalizeSources(results: Array<{ seat: SeatId; top: Awaited<ReturnType<typeof retrieveFromTopics>> }>): SourceReference[] {
  const seen = new Set<string>();
  const refs: SourceReference[] = [];
  for (const result of results) for (const source of result.top) {
    if (seen.has(source.contentId)) continue;
    seen.add(source.contentId);
    refs.push({ id: source.contentId, seatId: result.seat, title: source.title, url: source.url, author: source.author, kind: "knowledge" });
  }
  return refs;
}

async function generateWithModel(input: ReturnType<typeof summaryRequestSchema.parse>, topicTitle: string, base: SummaryResult): Promise<SummaryResult | null> {
  const client = getAIClient();
  if (!client) return null;
  try {
    const thirdSeatInvited = hasInvitedThirdSeat(input);
    // Only expose coarse, share-safe state to the final-card generator. User
    // follow-ups, added conditions and departure text can contain private
    // details and must not be copied into a shareable card.
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
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: "你是知识拼桌主持人。不要评价对错，不替用户做决定，不编造事实。只返回 JSON。" },
        { role: "user", content: `固定话题：${topicTitle}\n可分享的路径状态：${JSON.stringify(shareSafePath)}\n已有地图：${JSON.stringify(base.discussionMap)}\n返回 JSON：{discussionMap:{question,ripples,trajectory},soulSentence}。ripples 最多 3 项且每个 label 4—6 个汉字；soulSentence 不超过 40 字；不要臆测用户心理，不要把未邀请的第三席写成既成事实。` },
      ],
      temperature: 0.25,
    });
    const parsed = parseModelJson(completion.choices[0]?.message?.content ?? "") as { discussionMap?: unknown; soulSentence?: unknown };
    const checkedMap = discussionMapSchema.safeParse(parsed.discussionMap);
    if (!checkedMap.success || typeof parsed.soulSentence !== "string" || parsed.soulSentence.length === 0) return null;
    const generatedMap = checkedMap.data;
    // Prompt instructions are not a security boundary. Enforce the third-seat
    // rule after parsing so an uninvited conditional perspective cannot appear
    // as a completed turn in the result card.
    const discussionMap = thirdSeatInvited
      ? generatedMap
      : {
          ...generatedMap,
          ripples: generatedMap.ripples
            .filter((ripple) => ripple.sourceSeat !== "conditional")
            .map((ripple) => ripple.type === "perspective" ? { ...ripple, type: "premise" as const } : ripple)
            .slice(0, 3),
          trajectory: {
            start: generatedMap.trajectory.start === "conditional" ? base.discussionMap!.trajectory.start : generatedMap.trajectory.start,
            checkpoints: generatedMap.trajectory.checkpoints.filter((checkpoint) => checkpoint !== "conditional"),
            end: generatedMap.trajectory.end === "conditional" ? base.discussionMap!.trajectory.end : generatedMap.trajectory.end,
          },
        };
    return { ...base, discussionMap, soulSentence: parsed.soulSentence.slice(0, 40), mode: "generated" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("summary generation fallback:", error);
    return null;
  }
}

export async function POST(request: Request) {
  let input: ReturnType<typeof summaryRequestSchema.parse>;
  try { input = summaryRequestSchema.parse(await request.json()); } catch { return NextResponse.json({ error: "请求参数不完整" }, { status: 400 }); }
  const meta = makeRequestMeta(input, input.topicId);
  const topics = await loadTopics();
  const currentTopic = topics[input.topicId];
  if (!currentTopic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const firstChoice = (input.firstChoice ?? (input.tendency === "closer_first" ? "support_quit" : input.tendency === "closer_second" ? "oppose_quit" : "depends")) as FirstChoice;
  const secondChoice = (input.secondChoice ?? "set_deadline") as SecondChoice;
  const positionChange = (input.positionChange ?? "slightly_changed") as PositionChange;
  const thirdSeatInvited = hasInvitedThirdSeat(input);
  const fallback = getSummaryFallback(firstChoice, secondChoice, positionChange);
  const base: SummaryResult = {
    ...fallback,
    ...meta,
    discussionMap: buildDiscussionMap({
      tendency: input.tendency,
      secondChoice,
      thirdSeatInvited,
      perspectiveName: thirdSeatInvited ? input.perspectiveName : undefined,
    }, currentTopic.title),
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
  try { queryVec = await embedQuery(`${currentTopic.title} ${firstChoice} ${secondChoice} ${input.confirmedDivergence ?? ""}`); } catch { queryVec = null; }
  // Only expose evidence from seats that actually participated in this table.
  const seats: SeatId[] = thirdSeatInvited ? ["conditional", "realist", "action"] : ["realist", "action"];
  const results = await Promise.all(seats.map(async (seat) => ({ seat, top: await retrieveFromTopics(queryVec, { topicId: input.topicId, seat }, 1, { query: `${currentTopic.title} ${input.collisionPoint ?? ""}` }) })));
  const sources = normalizeSources(results);
  if (sources.length === 0) return NextResponse.json(base);
  const retrievalBase: SummaryResult = { ...base, sourceIds: sources.map((source) => source.id), sourceUrls: sources.map((source) => source.url ?? ""), authors: sources.map((source) => source.author ?? ""), sources, mode: "retrieval" };
  // 本地检索证据可以继续展示，但没有聊天模型时不能把它误标成 retrieval 产物：
  // 当前 summary 文本仍由规则兜底生成。
  if (!getAIClient()) return NextResponse.json({ ...retrievalBase, mode: "fallback" });
  const generated = await generateWithModel(input, currentTopic.title, retrievalBase);
  // 配置了 API 但生成失败时，保留检索证据并显式降级为 fallback，
  // 避免把“只检索、未生成”伪装成最终答案。
  return NextResponse.json(generated ?? { ...retrievalBase, mode: "fallback" });
}
