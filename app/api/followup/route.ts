// app/api/followup/route.ts
// 单席追问：用户举手问某一席，该席以自己的人设正面回答。
//
// 接通 LLM 后的变化（对比旧版）：
//   旧：reply = 语料摘录前 260 字 → 答非所问（问「孩子生病」回「被窝真暖和」）
//   新：人设 + 结构化本桌上下文 + 检索证据 → 模型重新组织出一段新回答
//
// 缺 key / 超时 / 校验失败 → 走 sourceExcerpt 兜底，mode 如实标注。

import { NextResponse } from "next/server";
import { loadTopics } from "@/lib/rag/topics";
import { retrieveSessionSources, sourceExcerpt, sourceFields } from "@/lib/session/rag";
import { callLLMJson } from "@/lib/ai/llm";
import { appendFollowup, deriveSessionId, getSession, issueSessionToken, renderSessionContext, upsertSession } from "@/lib/ai/session";
import { detectInjection, sanitizeConditions, sanitizeText } from "@/lib/session/guard";
import { seatNames } from "@/lib/prompts/seats/persona";
import { followupPrompt, renderEvidence } from "@/lib/prompts/actions";
import { sessionMode } from "@/lib/session/mode";
import { followupRequestSchema } from "@/lib/validators";
import { z } from "zod";

const outputSchema = z.object({
  reply: z.string().trim().min(1).max(400),
  boundaryAdjusted: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const parsed = followupRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "追问内容不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  // 0. 对抗防护：中和注入 / 收买 / 越狱，清洗进 prompt 的字段
  const guard = detectInjection(input.question);
  const question = sanitizeText(guard.safeText);
  const conditions = sanitizeConditions(input.userAddedConditions);

  // 1. 检索证据（限定当前话题 + 当前席位 —— 席位证据不能串）
  const sources = await retrieveSessionSources(
    input.topicId,
    input.seatId,
    `${topic.title} ${question}`,
  );

  // 2. 取/建会话，拼结构化上下文（sessionId 已改为高熵随机 + 签名校验）
  const sessionId = deriveSessionId({
    sessionId: input.sessionId,
    sessionSignature: input.sessionSignature,
    topicId: input.topicId,
    seatId: input.seatId,
  });
  upsertSession(sessionId, {
    topicId: input.topicId,
    topicTitle: topic.title,
    userAddedConditions: conditions,
  });
  const session = getSession(sessionId)!;

  // 3. 调 LLM，失败则降级
  const prompt = followupPrompt({
    seatId: input.seatId,
    question,
    sessionContext: renderSessionContext(session, seatNames),
    evidence: renderEvidence(sources),
  });
  const generated = await callLLMJson({
    ...prompt,
    parse: (raw) => outputSchema.parse(raw),
    temperature: 0.75,
    // 非思考模式：本产品回答都很短（≤120字），思考链对短文本生成无收益
    thinking: "disabled",
    maxTokens: 900,
    label: `followup:${input.seatId}`,
  });

  const fallback = input.seatId === "action"
    ? "如果继续等待也在持续消耗身心，先停止损失本身就是一种行动。关键是确认这种消耗是否已经超过你的恢复能力。"
    : "先把现金流、替代方案和最坏情况列出来，能承受风险再行动，会比只凭当下情绪更稳。";

  const reply = generated?.reply ?? sourceExcerpt(sources[0], fallback, 260);
  const mode = generated ? sessionMode("generated") : sessionMode("retrieval");

  // 4. 记录这一轮，供后续动作复用（记清洗后的 question，避免注入文本污染后续上下文）
  if (generated) appendFollowup(sessionId, { seatId: input.seatId, question, reply });

  return NextResponse.json({
    ...issueSessionToken(sessionId),
    seatId: input.seatId,
    reply,
    boundaryAdjusted: generated?.boundaryAdjusted ?? false,
    ...sourceFields(sources, input.seatId),
    mode,
  });
}
