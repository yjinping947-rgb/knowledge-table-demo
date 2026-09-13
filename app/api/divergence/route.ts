// app/api/divergence/route.ts
// 隐藏分歧：从刚才那轮质疑—回应里，找出双方「没说出口」的分歧。
//
// 接通 LLM 后的变化（对比旧版）：
//   旧：3 个候选完全硬编码，含既有席别词，与用户实际选的碰撞点无关
//   新：模型读真实交锋内容，产出绑定本次对话的分歧候选
//
// PRD 6.9 要求候选「必须绑定对话证据」，所以候选里带 conversationQuoteIds。

import { NextResponse } from "next/server";
import { loadTopics } from "@/lib/rag/topics";
import { callLLMJson } from "@/lib/ai/llm";
import { deriveSessionId, getSession, issueSessionToken, renderSessionContext, upsertSession } from "@/lib/ai/session";
import { sanitizeConditions, sanitizeText } from "@/lib/session/guard";
import { seatNames } from "@/lib/prompts/seats/persona";
import { divergencePrompt } from "@/lib/prompts/actions";
import { sessionMode } from "@/lib/session/mode";
import type { SeatId } from "@/lib/types";
import { divergenceRequestSchema } from "@/lib/validators";
import { z } from "zod";

const outputSchema = z.object({
  candidates: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60),
        title: z.string().trim().min(2).max(20),
        detail: z.string().trim().min(1).max(200),
      }),
    )
    .min(1)
    .max(4),
});

/** 降级：按碰撞点动态拼装，不再有与本次无关的固定席别词 */
function fallbackCandidates(collisionPoint: string, topicTitle: string) {
  return [
    {
      id: "risk-metric",
      title: "风险标尺不同",
      detail: `双方并不否认「${collisionPoint}」，但一方算的是眼前资源的断裂，另一方算的是持续消耗带来的长期代价。`,
    },
    {
      id: "time-horizon",
      title: "时间尺度错位",
      detail: `一方看未来几个月能否撑住，另一方看拖下去之后「${topicTitle}」上的选择权还剩下多少。`,
    },
    {
      id: "exit-condition",
      title: "行动门槛分歧",
      detail:
        "双方对「什么信号出现才该行动」的标准不同：是先有替代方案，还是持续消耗本身就构成触发条件。",
    },
  ];
}

export async function POST(request: Request) {
  const parsed = divergenceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "互质信息不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const originalSeat = input.selectedSeatId as SeatId;
  const opposingSeat: SeatId = originalSeat === "action" ? "realist" : "action";
  const collisionPoint = sanitizeText(input.collisionPoint);
  const challenge = sanitizeText(input.challenge);
  const response = sanitizeText(input.response);

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
    collision: {
      collisionPoint,
      selectedSeatId: originalSeat,
      challenge: { seatId: opposingSeat, reply: challenge },
      response: { seatId: originalSeat, reply: response },
    },
  });
  const session = getSession(sessionId)!;

  const prompt = divergencePrompt({
    collisionPoint,
    challenge,
    response,
    sessionContext: renderSessionContext(session, seatNames),
  });

  const generated = await callLLMJson({
    ...prompt,
    parse: (raw) => outputSchema.parse(raw),
    temperature: 0.8,
    // 非思考模式：结构化抽取任务，900 token 足够
    thinking: "disabled",
    maxTokens: 900,
    label: "divergence",
  });

  const candidates = generated?.candidates ?? fallbackCandidates(collisionPoint, topic.title);
  const mode = generated ? sessionMode("generated") : sessionMode("fallback");

  return NextResponse.json({
    ...issueSessionToken(sessionId),
    candidates: candidates.map((c, i) => ({
      ...c,
      // PRD 12.3 要求候选可回溯到本桌对话证据
      conversationQuoteIds: [`challenge_${i + 1}`, `response_${i + 1}`],
    })),
    mode,
  });
}
