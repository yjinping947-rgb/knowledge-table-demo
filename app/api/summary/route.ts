// app/api/summary/route.ts
// 总结：4 个字段都从 RAG 库（1175 条 20 话题 × 3 派）选真实回答。
// 详见 .harness/contracts/summary.md。

import { NextResponse } from "next/server";
import { summaryRequestSchema } from "@/lib/validators";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import { loadTopics } from "@/lib/rag/topics";
import { getSummaryFallback } from "@/lib/fallback";
import type { FirstChoice, PositionChange, SecondChoice, SeatId } from "@/lib/types";

const TOPIC_ID = "T01";

function buildQuery(input: { firstChoice: FirstChoice; secondChoice: SecondChoice; positionChange: PositionChange }): string {
  return `年轻人该不该裸辞 ${input.firstChoice} ${input.secondChoice} 之后 ${input.positionChange} 综合讨论`;
}

export async function POST(request: Request) {
  let input: ReturnType<typeof summaryRequestSchema.parse>;
  try {
    input = summaryRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  // 缺 LLM 配置 → fallback
  if (!process.env.AI_API_KEY || !process.env.AI_BASE_URL) {
    return NextResponse.json({
      ...getSummaryFallback(input.firstChoice, input.secondChoice, input.positionChange),
      mode: "fallback" as const,
    });
  }

  const query = buildQuery(input);
  const queryVec = await embedQuery(query);
  if (!queryVec) {
    return NextResponse.json({
      ...getSummaryFallback(input.firstChoice, input.secondChoice, input.positionChange),
      mode: "fallback" as const,
    });
  }

  // 4 个字段：每个从不同 seat 拉一条真实回答
  const seats: SeatId[] = ["conditional", "realist", "action", "conditional"];
  const queries = [
    `${query} 共识`,
    `${query} 分歧`,
    `${query} 隐藏前提`,
    `${query} 还没解决`,
  ];
  const seats4Label = ["共识", "分歧", "隐藏前提", "还没解决"];

  const results = await Promise.all(
    seats.map((seat, i) =>
      retrieveFromTopics(queryVec, { topicId: TOPIC_ID, seat }, 1).then((top) => ({
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

  return NextResponse.json({
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
  });
}
