// app/api/perspective/route.ts
// 第三席：用户确认隐藏分歧后，可邀请一个重新建构问题的视角。
//
// PRD 6.10 要求第三席必须「解释前两席为什么争不拢 / 提供新的问题重构 / 提供可执行判断工具」。
//
// 合并记录（三条实现线取长补短）：
// - 生成方式：保留本分支的 perspectivePrompt 单次调用 —— 模型一次产出
//   name（视角命名）+ reframe（问题重构）+ judgmentTool（判断工具）+ reply，
//   四者互相一致。队长版把 reply 交给 generateSeatReply，name 则从 3 个固定名里挑。
// - 契约字段：吸收队长版的 generatedFrom / knowledgeEvidence / claims /
//   sourceStatus / sourceNotice（其 UI 会读取），并保留 sourceStatus 的诚实语义：
//   只有真正经过模型综合且有绑定证据时才是 sufficient。
// - 保留本分支：会话记忆 + 对抗清洗 + mode 如实标注。

import { NextResponse } from "next/server";

import { loadTopics } from "@/lib/rag/topics";
import { makeRequestMeta, retrieveSessionSources, withSourceFields } from "@/lib/session/rag";
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
import { perspectivePrompt, renderEvidence } from "@/lib/prompts/actions";
import { sessionMode } from "@/lib/session/mode";
import { perspectiveRequestSchema } from "@/lib/validators";
import type { SeatId } from "@/lib/types";
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
  // 二次校验：拿主题下的席位归属反查（队长版），防未来检索器改动导致串席
  const safeSources = sources.filter((source) =>
    topic.seats.conditional.some((item) => item.contentId === source.contentId),
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

  // 把两席原话与碰撞内容也喂进去：第三席的解释力取决于它看到的交锋细节
  const contextExtra = [
    input.firstSeatStatement ? `【第一席原话】${sanitizeText(input.firstSeatStatement).slice(0, 500)}` : "",
    input.secondSeatStatement ? `【第二席原话】${sanitizeText(input.secondSeatStatement).slice(0, 500)}` : "",
    input.challenge ? `【碰撞质疑】${sanitizeText(input.challenge).slice(0, 400)}` : "",
    input.response ? `【碰撞回应】${sanitizeText(input.response).slice(0, 400)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = perspectivePrompt({
    confirmedDivergence,
    excludedNames: input.excludedNames,
    sessionContext: [renderSessionContext(session, seatNames), contextExtra].filter(Boolean).join("\n\n"),
    evidence: renderEvidence(safeSources, 300),
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

  // 只有真正经过模型综合且有绑定证据时才算 sufficient；
  // 纯规则兜底即使检索到材料，也不能声称关键 claim 已被验证（队长版语义）。
  const sourceStatus: "sufficient" | "insufficient" =
    generated && safeSources.length > 0 ? "sufficient" : "insufficient";

  const generationEvidence = {
    divergenceId: input.divergenceId ?? "confirmed-divergence",
    conversationQuoteIds: ["collision-challenge", "collision-response"],
  };
  const claims = [
    {
      claim: "将不可逆损失、可保留选项和复查信号分开排序",
      importance: "key" as const,
      sourceIds: safeSources.slice(0, 1).map((source) => source.contentId),
      supportStatus: safeSources.length > 0 ? ("supported" as const) : ("unsupported" as const),
      supportExplanation:
        safeSources.length > 0
          ? "条件派来源讨论了过渡期和判断条件。"
          : "当前席位没有检索到足够相关材料。",
    },
  ];

  return NextResponse.json({
    ...makeRequestMeta(input, input.topicId),
    ...issueSessionToken(sessionId),
    name: generated?.name ?? fallbackName,
    // 第三席即使使用确定性兜底，也属于"基于本桌对话的 AI 综合视角"，
    // 不是某个知乎席位的 retrieval 摘录；sourceStatus 单独表达证据是否足够。
    origin: "ai_synthesis",
    generatedFrom: generationEvidence,
    generationEvidence,
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
    ...withSourceFields(safeSources, "conditional"),
    knowledgeEvidence: { claims },
    claims,
    sourceStatus,
    sourceNotice:
      sourceStatus === "insufficient"
        ? "当前条件派材料不足；这是基于本桌对话生成的判断框架，不代表知乎作者观点。"
        : "",
    mode,
  });
}
