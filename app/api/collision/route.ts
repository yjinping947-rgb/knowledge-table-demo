import { NextResponse } from "next/server";

import { loadTopics } from "@/lib/rag/topics";
import {
  generateSeatReply,
  makeRequestMeta,
  retrieveSessionSources,
  withSourceFields,
} from "@/lib/session/rag";
import type { SeatId } from "@/lib/types";
import { collisionRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = collisionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "碰撞点参数不完整" }, { status: 400 });

  const input = parsed.data;
  const meta = makeRequestMeta(input, input.topicId);
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const originalSeat = input.selectedSeatId as SeatId;
  const opposingSeat: SeatId = originalSeat === "action" ? "realist" : "action";
  const [challengeSourcesRaw, responseSourcesRaw] = await Promise.all([
    retrieveSessionSources(input.topicId, opposingSeat, `${topic.title} 质疑 ${input.collisionPoint}`),
    retrieveSessionSources(input.topicId, originalSeat, `${topic.title} 回应 ${input.collisionPoint}`),
  ]);
  const challengeSources = challengeSourcesRaw.filter((source) => topic.seats[opposingSeat].some((item) => item.contentId === source.contentId));
  const responseSources = responseSourcesRaw.filter((source) => topic.seats[originalSeat].some((item) => item.contentId === source.contentId));

  const challengeFallback = originalSeat === "action"
    ? "这个损失需要处理，但为什么一定要立刻行动？请假、调整安排或先建立缓冲，是否也能降低损失？"
    : "等待能降低眼前风险，但如果等待本身让状态继续恶化，所谓安全会不会只是把更难恢复的损失往后推？";
  const responseFallback = originalSeat === "action"
    ? "缓冲方案只有在现实中可执行时才成立。如果已经反复尝试且消耗仍在加剧，继续等待同样是一种有成本的选择。"
    : "并不是所有等待都等于拖延。只要设置明确期限和退出条件，准备过程也可以是在主动保留选择权。";
  const conditions = input.userAddedConditions ?? (input.userContext ? [input.userContext] : []);
  const challengeGenerated = await generateSeatReply({
    topicTitle: topic.title,
    seat: opposingSeat,
    question: `请先质疑「${input.collisionPoint}」，并回应当前席位的具体判断。`,
    sources: challengeSources,
    userAddedConditions: conditions,
    conversationContext: input.firstSeatStatement || input.secondSeatStatement
      ? `第一席：${input.firstSeatStatement}\n第二席：${input.secondSeatStatement}`
      : undefined,
    fallback: `${challengeFallback}`,
  });
  const responseGenerated = await generateSeatReply({
    topicTitle: topic.title,
    seat: originalSeat,
    question: `请回应另一席针对「${input.collisionPoint}」的完整质疑：${challengeGenerated.reply}`,
    sources: responseSources,
    userAddedConditions: conditions,
    conversationContext: `碰撞点：${input.collisionPoint}\n质疑：${challengeGenerated.reply}`,
    fallback: responseFallback,
  });

  return NextResponse.json({
    ...meta,
    challenge: {
      seatId: opposingSeat,
      reply: challengeGenerated.reply,
      ...withSourceFields(challengeSources, opposingSeat),
    },
    response: {
      seatId: originalSeat,
      reply: responseGenerated.reply,
      ...withSourceFields(responseSources, originalSeat),
    },
    hostComment: `围绕「${input.collisionPoint}」，两席完成了一次质疑与回应。`,
    conversationQuoteIds: ["collision-challenge", "collision-response"],
    mode: challengeGenerated.mode === "generated" && responseGenerated.mode === "generated"
      ? "generated"
      : challengeGenerated.mode === "retrieval" || responseGenerated.mode === "retrieval"
        ? "retrieval"
        : "fallback",
  });
}
