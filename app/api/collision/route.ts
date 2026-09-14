// app/api/collision/route.ts
// 碰撞：另一席质疑 → 原席回应 → 主持人点出双方真正不同的地方。
//
// 关键设计（保留自本分支）：质疑和回应必须**一起生成**。分开调两次 API 的话，
// 质疑方看不到对方会怎么回应，容易变成两段互不相干的独白 —— 这正是 PRD 6.8
// 禁止的"只复述整篇来源"。一次调用让两段话互为上下文，同时省掉一半往返时间。
//
// 合并记录（三条实现线取长补短）：
// - 生成方式：保留本分支的 collisionPrompt 单次调用（队长版是两次串行
//   generateSeatReply，质疑无法预判回应）。
// - 上下文：吸收队长版的两席原话（firstSeatStatement / secondSeatStatement），
//   让质疑能盯着对方真实说过的内容，而不是凭空发问。
// - 保留本分支：会话记忆（renderSessionContext）+ 对抗清洗 + mode 如实标注。
// - 保留队长版：二次席位校验、conversationQuoteIds 契约字段。

import { NextResponse } from "next/server";

import { loadTopics } from "@/lib/rag/topics";
import { makeRequestMeta, retrieveSessionSources, sourceExcerpt, sourceFields } from "@/lib/session/rag";
import { callLLMJson } from "@/lib/ai/llm";
import {
  deriveSessionId,
  getSession,
  issueSessionToken,
  renderSessionContext,
  upsertSession,
} from "@/lib/ai/session";
import { sanitizeConditions, sanitizeText } from "@/lib/session/guard";
import { seatNames } from "@/lib/prompts/seats/persona";
import { collisionPrompt, renderEvidence } from "@/lib/prompts/actions";
import { sessionMode } from "@/lib/session/mode";
import type { SeatId } from "@/lib/types";
import { collisionRequestSchema } from "@/lib/validators";
import { z } from "zod";

const outputSchema = z.object({
  challenge: z.string().trim().min(1).max(400),
  response: z.string().trim().min(1).max(400),
  hostComment: z.string().trim().max(200).optional().default(""),
});

export async function POST(request: Request) {
  const parsed = collisionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "碰撞点参数不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const originalSeat = input.selectedSeatId as SeatId;
  const opposingSeat: SeatId = originalSeat === "action" ? "realist" : "action";
  const collisionPoint = sanitizeText(input.collisionPoint);

  // 两席各自检索各自的证据 —— 来源不能跨席位（PRD 17.3）
  const [challengeSourcesRaw, responseSourcesRaw] = await Promise.all([
    retrieveSessionSources(input.topicId, opposingSeat, `${topic.title} 质疑 ${collisionPoint}`),
    retrieveSessionSources(input.topicId, originalSeat, `${topic.title} 回应 ${collisionPoint}`),
  ]);
  // 二次校验：检索器已按席位过滤，这里再拿主题下的席位归属反查一次，
  // 防止未来检索器改动导致来源串席（队长版）。
  const challengeSources = challengeSourcesRaw.filter((source) =>
    topic.seats[opposingSeat].some((item) => item.contentId === source.contentId),
  );
  const responseSources = responseSourcesRaw.filter((source) =>
    topic.seats[originalSeat].some((item) => item.contentId === source.contentId),
  );

  const sessionId = deriveSessionId({
    sessionId: input.sessionId,
    sessionSignature: input.sessionSignature,
    topicId: input.topicId,
    seatId: originalSeat,
  });
  upsertSession(sessionId, {
    topicId: input.topicId,
    topicTitle: topic.title,
    userAddedConditions: sanitizeConditions(input.userAddedConditions),
    tendency: input.tendency,
  });
  const session = getSession(sessionId)!;

  // 队长版的两席原话 —— 让质疑盯住对方真正说过的东西（PRD 6.8）
  const seatStatements = [
    input.firstSeatStatement ? `【第一席原话】${sanitizeText(input.firstSeatStatement).slice(0, 600)}` : "",
    input.secondSeatStatement ? `【第二席原话】${sanitizeText(input.secondSeatStatement).slice(0, 600)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const sessionContext = [renderSessionContext(session, seatNames), seatStatements]
    .filter(Boolean)
    .join("\n\n");

  const prompt = collisionPrompt({
    selectedSeatId: originalSeat,
    opposingSeat,
    collisionPoint,
    sessionContext,
    challengeEvidence: renderEvidence(challengeSources),
    responseEvidence: renderEvidence(responseSources),
  });

  const generated = await callLLMJson({
    ...prompt,
    parse: (raw) => outputSchema.parse(raw),
    temperature: 0.8,
    // 非思考模式：质疑+回应各 90 字，短文本生成不需要思维链
    thinking: "disabled",
    maxTokens: 1000,
    label: `collision:${originalSeat}`,
  });

  // ── 降级路径：保持旧行为，但 mode 如实标注 ──
  const challengeFallback =
    originalSeat === "action"
      ? "这个损失需要处理，但为什么一定要立刻行动？请假、调整安排或先建立缓冲，是否也能降低损失？"
      : "等待能降低眼前风险，但如果等待本身让状态继续恶化，所谓安全会不会只是把更难恢复的损失往后推？";
  const responseFallback =
    originalSeat === "action"
      ? "缓冲方案只有在现实中可执行时才成立。如果已经反复尝试且消耗仍在加剧，继续等待同样是一种有成本的选择。"
      : "并不是所有等待都等于拖延。只要设置明确期限和退出条件，准备过程也可以是在主动保留选择权。";

  const challengeReply = generated?.challenge ?? challengeFallback;
  const responseReply = generated?.response ?? responseFallback;
  const mode = generated ? sessionMode("generated") : sessionMode("fallback");

  // 碰撞结果写回会话，供后续 divergence / perspective / summary 复用
  if (generated) {
    session.collision = {
      collisionPoint,
      selectedSeatId: originalSeat,
      challenge: { seatId: opposingSeat, reply: challengeReply },
      response: { seatId: originalSeat, reply: responseReply },
    };
  }

  return NextResponse.json({
    ...makeRequestMeta(input, input.topicId),
    ...issueSessionToken(sessionId),
    challenge: {
      seatId: opposingSeat,
      reply: challengeReply,
      ...sourceFields(challengeSources, opposingSeat),
    },
    response: {
      seatId: originalSeat,
      reply: responseReply,
      ...sourceFields(responseSources, originalSeat),
    },
    hostComment: generated?.hostComment || `围绕「${collisionPoint}」，两席完成了一次质疑与回应。`,
    conversationQuoteIds: ["collision-challenge", "collision-response"],
    mode,
    // 未生成时把原始证据片段附在末尾，保证降级状态下也不是空话
    ...(generated ? {} : { degradationNote: sourceExcerpt(challengeSources[0], "", 150) }),
  });
}
