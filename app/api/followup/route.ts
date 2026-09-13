// app/api/followup/route.ts
// 单席追问：用户举手问某一席，该席以自己的人设正面回答。
//
// 接通 LLM 后的变化（对比旧版）：
//   旧：reply = 语料摘录前 260 字 → 答非所问（问「孩子生病」回「被窝真暖和」）
//   新：人设 + 结构化本桌上下文 + 检索证据 → 模型重新组织出一段新回答
//
// 合并记录（两套并行方案取长补短）：
// - 采用 hock1024always 的 fallbackReply()：按 familyRisk / moneyRisk 分类给
//   更贴题的降级文案（比原来的通用兜底强）。
// - 保留会话记忆（appendFollowup + renderSessionContext）：追问可跨轮引用上文。
// - 保留对抗防护（detectInjection / sanitize*）。
//
// 缺 key / 超时 / 校验失败 → 走 fallbackReply 兜底，mode 如实标注。

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

/** 按风险类型分类的降级文案（来自 hock1024always，比通用兜底更贴题） */
function fallbackReply(seatId: "action" | "realist" | "conditional", question: string) {
  const familyRisk = /(孩子|小孩|父母|爸妈|老人|配偶|伴侣|家人|照护|生病|住院|医疗)/.test(question);
  const moneyRisk = /(房贷|债务|现金流|存款|开销|收入|赔偿)/.test(question);
  if (seatId === "action") {
    if (familyRisk) {
      return "如果家人需要照护，止损也不等于马上裸辞。先确认照护责任、医疗支出和最低现金流；如果继续工作已经影响照护或健康，就应把离开作为明确的止损方案，而不是继续硬撑。";
    }
    if (moneyRisk) {
      return "现实支出需要算清楚，但不能因此忽略正在发生的健康损失。先划出最低生活线和最晚行动时间；如果继续工作会让你失去恢复和求职能力，就要把行动提前。";
    }
    return "如果继续等待也在持续消耗身心，先停止损失本身就是一种行动。关键不是冲动辞职，而是确认你的恢复能力、最低生活线和下一步准备是否足够。";
  }
  if (seatId === "conditional") {
    return "先把判断拆成三个条件：现在必须保护什么、还能保留什么、什么信号出现时重新判断。有了这三条，走与留就不再是二选一。";
  }
  if (familyRisk) {
    return "家人需要照护时，现金流和保障的重要性会更高。先列出医疗与生活支出、可获得的家庭支持和替代工作安排，再设置一个明确期限，避免把谨慎变成无限期硬撑。";
  }
  if (moneyRisk) {
    return "先把现金流、固定支出和最坏情况列出来，确认中断收入后还能撑多久。若暂时不能离开，可以同步准备下一份工作并设定复查期限，而不是默认一直坚持。";
  }
  return "先把现金流、替代方案和最坏情况列出来，能承受风险再行动，会比只凭当下情绪更稳。与此同时要设定期限，避免等待变成没有终点的拖延。";
}

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

  const fallback = fallbackReply(input.seatId, question);
  const reply = generated?.reply ?? sourceExcerpt(sources[0], fallback, 260);
  const mode = generated ? sessionMode("generated") : sessionMode("retrieval");

  // 4. 记录这一轮，供后续动作复用（记清洗后的 question，避免注入文本污染后续上下文）
  if (generated) appendFollowup(sessionId, { seatId: input.seatId, question, reply });

  return NextResponse.json({
    ...issueSessionToken(sessionId),
    seatId: input.seatId,
    reply,
    boundaryAdjusted: generated?.boundaryAdjusted ?? false,
    // sourceFields 同时给出 sourceSeats（真实来源）与 sourceSeatIds（PRD 10.3 契约）
    ...sourceFields(sources, input.seatId),
    mode,
  });
}
