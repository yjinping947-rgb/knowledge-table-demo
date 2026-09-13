// app/api/summary/route.ts
// 总结：4 个字段都从 RAG 库（1175 条 20 话题 × 3 派）选真实回答。
// 详见 .harness/contracts/summary.md。

import { NextResponse } from "next/server";
import { summaryRequestSchema } from "@/lib/validators";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import { loadTopics } from "@/lib/rag/topics";
import { getSummaryFallback } from "@/lib/fallback";
import type { FirstChoice, PositionChange, SecondChoice, SeatId } from "@/lib/types";

function buildQuery(input: { firstChoice: FirstChoice; secondChoice: SecondChoice; positionChange: PositionChange }, topicTitle: string): string {
  return `${topicTitle} ${input.firstChoice} ${input.secondChoice} 之后 ${input.positionChange} 综合讨论`;
}

const tendencyLabels = {
  closer_first: "更接近第一席",
  closer_second: "更接近第二席",
  both_valid: "认为两边都有道理",
  undecided: "暂时无法判断",
  missed_point: "认为两边都没说到重点",
} as const;

function buildThoughtTrail(
  input: ReturnType<typeof summaryRequestSchema.parse>,
  topicTitle: string,
) {
  const tendency = input.tendency ? tendencyLabels[input.tendency] : "根据条件判断";
  const collisionPoint = input.collisionPoint ?? "尚未记录具体碰撞点";
  const challenge = input.challenge ?? "质疑尚未记录";
  const response = input.response ?? "回应尚未记录";
  const confirmedDivergence = input.confirmedDivergence ?? "尚未确认";
  const perspective = input.perspectiveName
    ? `${input.perspectiveName}${input.perspectiveReframe ? `：${input.perspectiveReframe}` : ""}`
    : "尚未邀请第三席";

  return {
    tendency: `最初，你${tendency}。`,
    collisionPoint: `你选中了「${collisionPoint}」。`,
    challenge: `带来动摇的质疑：${challenge}`,
    response: `原席位的回应：${response}`,
    turningPoint: `这次互质让「${topicTitle}」从立场选择变成了对条件、代价和时间点的判断。`,
    confirmedDivergence: `你确认的隐藏分歧：${confirmedDivergence}`,
    perspective: `第三知识视角：${perspective}`,
    departure: "离桌时，你不必立刻决定裸辞；你已经知道下一次要观察什么信号、保护什么底线。",
  };
}

function buildTopicFallback(
  input: ReturnType<typeof summaryRequestSchema.parse>,
  topicTitle: string,
) {
  const base = getSummaryFallback(input.firstChoice, input.secondChoice, input.positionChange);
  const before = {
    support_quit: "倾向主动推动改变",
    oppose_quit: "倾向先保持现状",
    depends: "倾向根据条件判断",
  }[input.firstChoice];
  const during = {
    leave_now: "在具体情境下选择立即行动",
    wait_offer: "在具体情境下选择继续观察",
    set_deadline: "在具体情境下选择设定边界",
  }[input.secondChoice];
  const after = {
    unchanged: "核心立场保持不变",
    slightly_changed: "保留原方向并补充条件",
    changed: "主要判断发生了变化",
  }[input.positionChange];
  const summary = {
    ...base,
    consensus: `关于「${topicTitle}」，不同立场都在权衡目标、资源与可能承担的代价。`,
    disagreement: "真正的分歧，是先推动改变，还是先把风险控制在可承受范围内。",
    hiddenAssumption: "你的判断可能默认当前信息已经足够，但具体条件和后续反馈仍会改变选择。",
    trajectory: { before, during, after },
    openQuestion: `如果「${topicTitle}」的代价继续增加，你会用什么信号提醒自己调整判断？`,
    mode: "fallback" as const,
  };
  if (input.flow !== "knowledge-table-v2") return summary;

  return {
    ...summary,
    thoughtTrail: buildThoughtTrail(input, topicTitle),
    perspective: input.perspectiveName
      ? {
          name: input.perspectiveName,
          basis: `来自两席互质后确认的隐藏分歧：${input.confirmedDivergence ?? "尚未确认"}`,
          reframe: input.perspectiveReframe ?? "把问题改写成对损失、边界和下一次检查点的判断。",
          tool: "列出不可逆损失、仍可保留的选项与下一次复查的触发线。",
          reply: "先不急着裁决谁对谁错，把选择拆成现在必须保护什么、还能保留什么、何时重新判断。",
          sourceIds: [],
          sourceUrls: [],
          authors: [],
          mode: "fallback" as const,
        }
      : undefined,
  };
}

export async function POST(request: Request) {
  let input: ReturnType<typeof summaryRequestSchema.parse>;
  try {
    input = summaryRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const topics = await loadTopics();
  const currentTopic = topics[input.topicId];
  if (!currentTopic) {
    return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });
  }

  // 缺 LLM 配置 → fallback
  if (!process.env.AI_API_KEY || !process.env.AI_BASE_URL) {
    return NextResponse.json(buildTopicFallback(input, currentTopic.title));
  }

  const query = buildQuery(input, currentTopic.title);
  const queryVec = await embedQuery(query);
  if (!queryVec) {
    return NextResponse.json({
      ...buildTopicFallback(input, currentTopic.title),
    });
  }

  // 4 个字段：每个从不同 seat 拉一条真实回答（避免重复）
  const seats: SeatId[] = ["conditional", "realist", "action", "realist"];
  const seats4Label = ["共识", "分歧", "隐藏前提", "还没解决"];

  const results = await Promise.all(
    seats.map((seat, i) =>
      retrieveFromTopics(queryVec, { topicId: input.topicId, seat }, 1).then((top) => ({
        label: seats4Label[i],
        seat,
        top,
      })),
    ),
  );

  // 4 个字段都填上：取该 seat 的 top[0].contentText 前 200 字
  const pick = (i: number) => {
    const r = results[i];
    if (r.top.length === 0) {
      // 该 seat 缺数据时退到下一 seat
      const fallback = results.find((x) => x.top.length > 0);
      if (!fallback) return "";
      return `（来自 ${fallback.seat} 席位的回答）${fallback.top[0].contentText.slice(0, 200)}`;
    }
    return `（来自「${r.top[0].author}」）${r.top[0].contentText.slice(0, 200)}`;
  };

  const result = {
    consensus: pick(0),
    disagreement: pick(1),
    hiddenAssumption: pick(2),
    trajectory: {
      before: `用户开始讨论时倾向 ${input.firstChoice === "support_quit" ? "支持裸辞" : input.firstChoice === "oppose_quit" ? "反对裸辞" : "看情况"}`,
      during: `在具体情境下选择 ${input.secondChoice === "leave_now" ? "立即离开" : input.secondChoice === "wait_offer" ? "坚持到 offer" : "设离职期限"}`,
      after: `反思后立场 ${input.positionChange === "unchanged" ? "未变" : input.positionChange === "slightly_changed" ? "微调" : "改变"}`,
    },
    openQuestion: pick(3),
    sourceIds: results.flatMap((r) => r.top.map((t) => t.contentId)),
    sourceUrls: results.flatMap((r) => r.top.map((t) => t.url)),
    authors: results.flatMap((r) => r.top.map((t) => t.author)),
    mode: "ai" as const,
  };
  if (input.flow !== "knowledge-table-v2") return NextResponse.json(result);

  return NextResponse.json({
    ...result,
    thoughtTrail: buildThoughtTrail(input, currentTopic.title),
    perspective: input.perspectiveName
      ? {
          name: input.perspectiveName,
          basis: `来自两席互质后确认的隐藏分歧：${input.confirmedDivergence ?? "尚未确认"}`,
          reframe: input.perspectiveReframe ?? "把问题改写成对损失、边界和下一次检查点的判断。",
          tool: "列出不可逆损失、仍可保留的选项与下一次复查的触发线。",
          reply: "先不急着裁决谁对谁错，把选择拆成现在必须保护什么、还能保留什么、何时重新判断。",
          sourceIds: [],
          sourceUrls: [],
          authors: [],
          mode: "ai" as const,
        }
      : undefined,
  });
}
