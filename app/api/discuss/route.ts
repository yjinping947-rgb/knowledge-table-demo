// app/api/discuss/route.ts
// 讨论入口：实时知乎搜索优先，失败时回退到本地 RAG；Agent 从多条材料提炼观点。

import { NextResponse } from "next/server";
import { discussRequestSchema } from "@/lib/validators";
import { loadTopics, topicForRequest } from "@/lib/rag/topics";
import { retrieveSessionSourcesDetailed } from "@/lib/session/rag";
import { generateSeatReply } from "@/lib/session/agent";
import type { FirstChoice, SecondChoice, SeatId } from "@/lib/types";
import { seatLabelsForTopic } from "@/lib/session/seatLabels";

// firstChoice/secondChoice 仍是旧版状态机字段，只用于决定席位，不直接作为搜索词。
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

const SEAT_SEARCH_INTENT: Record<SeatId, string> = {
  action: "支持尝试 实际做法 机会 先做什么",
  realist: "风险 成本 难点 真实情况 代价",
  conditional: "适合条件 前提 边界 如何判断 例外",
};

function buildQuery(input: { firstChoice: FirstChoice; secondChoice?: SecondChoice | null; round: 1 | 2 }, topicTitle: string): string {
  const seat = input.round === 1 ? FIRST_SEAT[input.firstChoice] : SECOND_SEAT[input.secondChoice!];
  return `${topicTitle} ${SEAT_SEARCH_INTENT[seat]}`;
}

function topicFallback(topicTitle: string, input: { round: 1 | 2; firstChoice: FirstChoice; secondChoice?: SecondChoice | null }, seat: SeatId) {
  return {
    selectedSeatId: input.round === 1 ? (input.firstChoice === "support_quit" ? "action" : input.firstChoice === "oppose_quit" ? "realist" : "conditional") : (input.secondChoice === "leave_now" ? "action" : input.secondChoice === "wait_offer" ? "realist" : "conditional"),
    reply: seat === "action"
      ? `「${topicTitle}」别只停在判断上，先拆成一个今天能验证的小动作，用反馈确认下一步。`
      : seat === "realist"
        ? `谈「${topicTitle}」先看资源、时间和最坏结果，再判断这一步是否承受得住，别把愿望当条件。`
        : `「${topicTitle}」没有统一答案，先找出会改变判断的条件，设个复查时间再调整。`,
    hostComment: `围绕「${topicTitle}」，先把当前最重要的一步说清楚。`,
    sourceIds: [],
    sourceUrls: [],
    authors: [],
    sourceStatus: "no-result" as const,
    mode: "fallback" as const,
  };
}

function tooSimilar(first: string, second: string): boolean {
  const normalize = (value: string) => value.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "").toLowerCase();
  const a = normalize(first);
  const b = normalize(second);
  if (a.length < 10 || b.length < 10) return false;
  if (a.slice(0, 10) === b.slice(0, 10)) return true;
  const grams = (value: string) => new Set(Array.from({ length: value.length - 1 }, (_, i) => value.slice(i, i + 2)));
  const left = grams(a);
  const right = grams(b);
  const shared = [...left].filter((gram) => right.has(gram)).length;
  return shared / Math.max(1, Math.min(left.size, right.size)) >= 0.62;
}

async function buildTopicFallback(
  input: ReturnType<typeof discussRequestSchema.parse>,
  topicTitle: string,
  seat: SeatId,
) {
  const top = (await retrieveSessionSourcesDetailed(
    input.topicId,
    seat,
    buildQuery(input, topicTitle),
    3,
    input.customQuestion,
  ));
  if (top.sources.length === 0) return topicFallback(topicTitle, input, seat);
  return {
    selectedSeatId: seat,
    reply: topicFallback(topicTitle, input, seat).reply,
    hostComment: `围绕「${topicTitle}」，先听听${seat === "action" ? "行动派" : seat === "realist" ? "现实派" : "条件派"}怎么判断。`,
    sourceIds: top.sources.map((item) => item.contentId),
    sourceUrls: top.sources.map((item) => item.url),
    authors: top.sources.map((item) => item.author),
    sourceStatus: top.status,
    mode: "fallback" as const,
  };
}

export async function POST(request: Request) {
  let input: ReturnType<typeof discussRequestSchema.parse>;
  try {
    input = discussRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const topics = await loadTopics();
  const currentTopic = topicForRequest(topics, input.topicId, input.customQuestion);
  if (!currentTopic) {
    return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });
  }

  const seat = input.round === 1
    ? FIRST_SEAT[input.firstChoice]
    : SECOND_SEAT[input.secondChoice!];

  const query = buildQuery(input, currentTopic.title);
  const retrieved = await retrieveSessionSourcesDetailed(input.topicId, seat, query, 3, input.customQuestion);
  if (retrieved.sources.length === 0) return NextResponse.json(await buildTopicFallback(input, currentTopic.title, seat));
  const generated = await generateSeatReply({
    seat,
    topicTitle: currentTopic.title,
    question: input.round === 2
      ? "这是第二席发言。请针对上一席的实际说法给出不同角度：先承认一处合理点，再明确指出你的判断哪里不同，并给出只属于你这一席的建议，禁止复述上一席。"
      : `用户正在了解「${currentTopic.title}」这个主题，请给出${seat === "action" ? "主动行动" : seat === "realist" ? "现实约束" : "条件判断"}角度的核心判断。`,
    sources: retrieved.sources,
    context: input.previousReply ? `上一席实际发言：${input.previousReply}` : undefined,
    contrastReply: input.previousReply || undefined,
  });
  const labels = seatLabelsForTopic(input.topicId, currentTopic.title);
  const fallbackReply = topicFallback(currentTopic.title, input, seat).reply;
  const reply = generated && !(input.round === 2 && input.previousReply && tooSimilar(input.previousReply, generated))
    ? generated
    : fallbackReply;
  return NextResponse.json({
    selectedSeatId: seat,
    reply,
    hostComment: `围绕「${currentTopic.title}」，先听听${seat === "action" ? "行动派" : seat === "realist" ? "现实派" : "条件派"}怎么判断。`,
    sourceIds: retrieved.sources.map((t) => t.contentId),
    sourceUrls: retrieved.sources.map((t) => t.url),
    authors: retrieved.sources.map((t) => t.author),
    sourceStatus: retrieved.status,
    mode: reply === generated ? "ai" as const : "fallback" as const,
    seatLabel: labels[seat],
  });
}
