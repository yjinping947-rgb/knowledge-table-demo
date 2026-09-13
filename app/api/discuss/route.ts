// app/api/discuss/route.ts
// 两轮讨论：RAG 检索提供依据，聊天模型生成针对当前选择的新回答。
// 详见 .harness/contracts/discuss.md。

import { NextResponse } from "next/server";
import { discussRequestSchema } from "@/lib/validators";
import { loadTopics } from "@/lib/rag/topics";
import { getDiscussFallback } from "@/lib/fallback";
import { generateSeatReply, retrieveSessionSources, sourceFields } from "@/lib/session/rag";
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

function buildQuery(input: { firstChoice: FirstChoice; secondChoice?: SecondChoice | null; round: 1 | 2 }, topicTitle: string): string {
  if (input.round === 1) {
    return `${topicTitle} ${input.firstChoice} 实际经验 真实案例`;
  }
  return `${topicTitle} ${input.secondChoice} 的真实经历`;
}

function buildFallback(input: { firstChoice: FirstChoice; secondChoice?: SecondChoice | null; round: 1 | 2 }) {
  return getDiscussFallback(input.round, input.firstChoice, input.secondChoice ?? null);
}

async function buildTopicFallback(
  input: ReturnType<typeof discussRequestSchema.parse>,
  topicTitle: string,
  seat: SeatId,
) {
  const top = await retrieveSessionSources(
    input.topicId,
    seat,
    `${topicTitle} ${input.firstChoice} ${input.secondChoice ?? ""} 真实经历`,
    3,
  );
  if (top.length === 0) return { ...buildFallback(input), mode: "fallback" as const };
  return {
    selectedSeatId: seat,
    reply: top[0].contentText.slice(0, 280),
    hostComment: `围绕「${topicTitle}」，请 ${top[0].author} 先接话。`,
    ...sourceFields(top),
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
  const currentTopic = topics[input.topicId];
  if (!currentTopic) {
    return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });
  }

  const seat = input.round === 1
    ? FIRST_SEAT[input.firstChoice]
    : SECOND_SEAT[input.secondChoice!];

  const query = buildQuery(input, currentTopic.title);
  const top = await retrieveSessionSources(input.topicId, seat, query, 3);
  if (top.length === 0) {
    return NextResponse.json(await buildTopicFallback(input, currentTopic.title, seat));
  }

  const fallback = buildFallback(input);
  const generated = await generateSeatReply({
    topicTitle: currentTopic.title,
    seat,
    question: input.round === 1
      ? `请针对用户“${input.firstChoice}”的选择，围绕当前话题做一次第一席/第二席发言，提出一个有依据的关键追问。`
      : `请针对用户在具体情境下选择“${input.secondChoice}”，指出该选择需要面对的一个关键条件或代价。`,
    sources: top,
    fallback: fallback.reply,
  });

  return NextResponse.json({
    selectedSeatId: seat,
    reply: generated.reply,
    hostComment: `围绕「${currentTopic.title}」，${seat === "action" ? "行动派" : seat === "realist" ? "现实派" : "条件派"}回应了你的选择。`,
    ...sourceFields(top),
    mode: generated.mode,
  });
}
