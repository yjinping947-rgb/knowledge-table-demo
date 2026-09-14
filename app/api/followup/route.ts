// app/api/followup/route.ts
// 单席追问：用户举手问某一席，该席以自己的人设正面回答。
//
// 合并记录（三条实现线取长补短）：
// - 生成走队长版的 generateSeatReply（统一入口，内部已固化 thinking=disabled）；
//   它自带 conversationContext 参数，正好承接本分支的会话记忆。
// - 保留本分支的对抗防护（detectInjection / sanitize*）与会话记忆
//   （renderSessionContext / appendFollowup）。
// - 保留队长版的二次席位校验（topic.seats[seat] 反查，防未来检索器改动导致串席）。
// - 兜底采用队长版的 seatFallback（按情境分类）。
//
// 缺 key / 超时 / 校验失败 → 走 fallback，mode 如实标注。

import { NextResponse } from "next/server";

import { loadTopics } from "@/lib/rag/topics";
import {
  generateSeatReply,
  makeRequestMeta,
  retrieveSessionSources,
  seatFallback,
  withSourceFields,
} from "@/lib/session/rag";
import {
  appendFollowup,
  deriveSessionId,
  getSession,
  issueSessionToken,
  renderSessionContext,
  upsertSession,
} from "@/lib/ai/session";
import { detectInjection, sanitizeConditions, sanitizeText } from "@/lib/session/guard";
import { seatNames } from "@/lib/prompts/seats/persona";
import { followupRequestSchema } from "@/lib/validators";
import type { SeatId } from "@/lib/types";

export async function POST(request: Request) {
  const parsed = followupRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "追问内容不完整" }, { status: 400 });

  const input = parsed.data;
  const meta = makeRequestMeta(input, input.topicId);
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const seat = input.seatId as SeatId;

  // 0. 对抗防护：中和注入 / 收买 / 越狱，清洗进 prompt 的字段
  const guard = detectInjection(input.question);
  const question = sanitizeText(guard.safeText);
  const conditions = sanitizeConditions([
    ...(input.context.userAddedConditions ?? []),
    ...(input.userAddedConditions ?? []),
  ]);

  // 1. 检索证据（限定当前话题 + 当前席位 —— 席位证据不能串）
  const sources = await retrieveSessionSources(input.topicId, seat, `${topic.title} ${question}`, 3);
  // 检索器已按席位过滤；二次检查可防止未来检索器改动导致来源串席（队长版）。
  const safeSources = sources.filter((source) =>
    topic.seats[seat].some((item) => item.contentId === source.contentId),
  );

  // 2. 取/建会话（sessionId 已改为高熵随机 + 签名校验）
  const sessionId = deriveSessionId({
    sessionId: input.sessionId,
    sessionSignature: input.sessionSignature,
    topicId: input.topicId,
    seatId: seat,
  });
  upsertSession(sessionId, {
    topicId: input.topicId,
    topicTitle: topic.title,
    userAddedConditions: conditions,
  });
  const session = getSession(sessionId)!;

  // 3. 生成（统一入口，thinking=disabled；会话上下文通过 conversationContext 注入）
  const generated = await generateSeatReply({
    topicTitle: topic.title,
    seat,
    question,
    sources: safeSources,
    userAddedConditions: conditions,
    conversationContext: renderSessionContext(session, seatNames),
    fallback: seatFallback(seat, question, conditions),
  });

  // 4. 记录这一轮，供后续动作复用（记清洗后的 question，避免注入文本污染后续上下文）
  if (generated.mode === "generated") {
    appendFollowup(sessionId, { seatId: seat, question, reply: generated.reply });
  }

  return NextResponse.json({
    ...meta,
    // 放在 meta 之后：用服务端派发/校验过的房间号覆盖客户端传来的 sessionId
    ...issueSessionToken(sessionId),
    seatId: seat,
    reply: generated.reply,
    ...withSourceFields(safeSources, seat),
    mode: generated.mode,
  });
}
