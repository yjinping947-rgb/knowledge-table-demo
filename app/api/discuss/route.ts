// app/api/discuss/route.ts
// 两轮讨论：reply 来自 RAG 库（1175 条 20 话题 × 3 派）真实内容，不调 LLM 生成。
// 详见 .harness/contracts/discuss.md。

import { NextResponse } from "next/server";
import { discussRequestSchema } from "@/lib/validators";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import { loadTopics } from "@/lib/rag/topics";
import { getDiscussFallback } from "@/lib/fallback";
import type { FirstChoice, SecondChoice, SeatId } from "@/lib/types";

// 沿用原 fallback 表的"立意映射"逻辑：firstChoice 决定首轮应被谁回应，secondChoice 决定次轮
const FIRST_SEAT: Record<FirstChoice, SeatId> = {
  support_quit: "action",
  oppose_quit: "realist",
  depends: "conditional",
};
const SECOND_SEAT: Record<SecondChoice, SeatId> = {
  leave_now: "action",
  wait_offer: "realist",
  set_deadline: "conditional",
};

const TOPIC_ID = "T01"; // 知识拼桌固定话题"年轻人该不该裸辞"

function buildQuery(input: { firstChoice: FirstChoice; secondChoice?: SecondChoice | null; round: 1 | 2 }): string {
  if (input.round === 1) {
    return `年轻人该不该裸辞 ${input.firstChoice} 实际经验 真实案例`;
  }
  return `裸辞 ${input.secondChoice} 的真实经历`;
}

function buildFallback(input: { firstChoice: FirstChoice; secondChoice?: SecondChoice | null; round: 1 | 2 }) {
  return getDiscussFallback(input.round, input.firstChoice, input.secondChoice ?? null);
}

export async function POST(request: Request) {
  let input: ReturnType<typeof discussRequestSchema.parse>;
  try {
    input = discussRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const seat = input.round === 1
    ? FIRST_SEAT[input.firstChoice]
    : SECOND_SEAT[input.secondChoice!];

  // 缺 LLM 配置 → fallback
  if (!process.env.AI_API_KEY || !process.env.AI_BASE_URL) {
    return NextResponse.json({ ...buildFallback(input), mode: "fallback" as const });
  }

  // 1. embedding
  const query = buildQuery(input);
  const queryVec = await embedQuery(query);
  if (!queryVec) {
    return NextResponse.json({ ...buildFallback(input), mode: "fallback" as const });
  }

  // 2. RAG 检索（限定 topicId=T01 + seat）
  const top = await retrieveFromTopics(queryVec, { topicId: TOPIC_ID, seat }, 3);
  if (top.length === 0) {
    return NextResponse.json({ ...buildFallback(input), mode: "fallback" as const });
  }

  // 3. 拼响应：reply 用 top[0] 的 ContentText 摘录，附原文 url
  const main = top[0];
  return NextResponse.json({
    selectedSeatId: seat,
    reply: main.contentText.slice(0, 280),
    hostComment: `「${main.author}」对「${main.title}」的回答`,
    sourceIds: top.map((t) => t.contentId),
    sourceUrls: top.map((t) => t.url),
    authors: top.map((t) => t.author),
    mode: "ai" as const,
  });
}
