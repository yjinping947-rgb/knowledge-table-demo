// app/api/perspective/route.ts
// 第三席：用户确认隐藏分歧后，可邀请一个重新建构问题的视角。
//
// 接通 LLM 后的变化（对比旧版）：
//   旧：name 从 3 个固定名里挑、reframe 硬编码、reply 是硬编码 + 语料摘录
//   新：模型解释「前两席为什么争不拢」+ 重构问题 + 给可执行判断工具
//
// PRD 6.10 要求第三席必须「解释前两席为什么争不拢 / 提供新的问题重构 / 提供可执行判断工具」。

import { NextResponse } from "next/server";
import { loadTopics } from "@/lib/rag/topics";
import { retrieveSessionSources, sourceFields } from "@/lib/session/rag";
import { callLLMJson } from "@/lib/ai/llm";
import { deriveSessionId, getSession, issueSessionToken, renderSessionContext, upsertSession } from "@/lib/ai/session";
import { sanitizeConditions, sanitizeText } from "@/lib/session/guard";
import { seatNames } from "@/lib/prompts/seats/persona";
import { perspectivePrompt, renderEvidence } from "@/lib/prompts/actions";
import { sessionMode } from "@/lib/session/mode";
import type { SeatId } from "@/lib/types";
import { perspectiveRequestSchema } from "@/lib/validators";
import { z } from "zod";

const outputSchema = z.object({
  name: z.string().trim().min(2).max(30),
  reframe: z.string().trim().min(1).max(200),
  judgmentTool: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
  reply: z.string().trim().min(1).max(400),
});

const fallbackNames = ["选择权保留视角", "可逆性排序视角", "行动触发线视角"];

export async function POST(request: Request) {
  const parsed = perspectiveRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "隐藏分歧尚未确认" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const originalSeat = input.selectedSeatId as SeatId;
  const confirmedDivergence = sanitizeText(input.confirmedDivergence);

  // 第三席检索 conditional 席位的语料 —— 来源席位必须与回答席位一致
  const sources = await retrieveSessionSources(
    input.topicId,
    "conditional",
    `${topic.title} ${confirmedDivergence} 保留选择 条件 期限`,
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
    confirmedDivergence,
  });
  const session = getSession(sessionId)!;

  const prompt = perspectivePrompt({
    confirmedDivergence,
    excludedNames: input.excludedNames,
    sessionContext: renderSessionContext(session, seatNames),
    evidence: renderEvidence(sources, 300),
  });

  const generated = await callLLMJson({
    ...prompt,
    parse: (raw) => outputSchema.parse(raw),
    temperature: 0.85,
    // 非思考模式：第三席输出约 300 字，短文本生成无需思维链
    thinking: "disabled",
    maxTokens: 1200,
    label: "perspective",
  });

  const mode = generated ? sessionMode("generated") : sessionMode("retrieval");
  // 生成失败时，从候选名里挑一个没用过的（保持旧行为）
  const fallbackName =
    fallbackNames.find((candidate) => !input.excludedNames.includes(candidate)) ?? fallbackNames[0];

  const judgmentTool = generated?.judgmentTool ?? [
    "列出不可逆损失、仍可保留的选项",
    "为每项设定下一次复查的触发线",
    "选择当前最小但有效的一步",
  ];

  return NextResponse.json({
    ...issueSessionToken(sessionId),
    name: generated?.name ?? fallbackName,
    origin: generated ? "ai_synthesis" : "retrieval",
    // 前端 PerspectiveResult 契约里的字段，保持存在（basis / tool）
    basis: `来自两席互质后确认的隐藏分歧：${confirmedDivergence}`,
    reframe:
      generated?.reframe ??
      `真正的问题不只是「${topic.title}」该选哪一边，而是哪条路径既能避免更难恢复的损失，又能保留后续调整空间。`,
    tool: judgmentTool.join("；"),
    judgmentTool,
    reply:
      generated?.reply ??
      // 降级时只给本桌归纳 + 通用判断工具，不拼接语料原文
      // （PRD 8.2 明令禁止把检索结果原文直接当回答）
      `先不急着裁决谁对谁错。把选择拆成「现在必须保护什么、还能保留什么、何时重新判断」三问。当前材料不足以支撑一个第三方视角，这里只提供一个通用框架。`,
    ...sourceFields(sources, "conditional"),
    sourceStatus: generated ? "sufficient" : "insufficient",
    sourceNotice: generated ? "" : "当前第三方视角材料不足，以上仅为通用判断框架。",
    mode,
  });
}
