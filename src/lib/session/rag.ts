import { randomUUID } from "node:crypto";

import { getAIClient, hasAIConfig, AI_MODEL } from "@/lib/ai/client";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import type { ApiMeta, EvidenceFields, Mode, SeatId } from "@/lib/types";

export type SessionSource = Awaited<ReturnType<typeof retrieveFromTopics>>[number];

/**
 * 检索是可失败的外部边界。将异常收敛为空数组，调用方才能选择当前席位的安全兜底，
 * 而不是把 embedding 服务的错误暴露给用户或误用上一轮来源。
 */
export async function retrieveSessionSources(topicId: string, seat: SeatId, query: string, count = 3) {
  try {
    const queryVec = await embedQuery(query);
    return await retrieveFromTopics(queryVec, { topicId, seat }, count, { query });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("session retrieval failed:", error);
    return [];
  }
}

export function sourceExcerpt(source: SessionSource | undefined, fallback: string, max = 210) {
  if (!source) return fallback;
  return source.contentText.replace(/\s+/g, " ").trim().slice(0, max);
}

export function sourceFields(sources: SessionSource[]) {
  return {
    sourceIds: sources.map((source) => source.contentId),
    // retrieveFromTopics 已按 seat 过滤；具体席位由 withSourceFields 注入。
    sourceSeatIds: [] as SeatId[],
    sourceUrls: sources.map((source) => source.url),
    authors: sources.map((source) => source.author),
  };
}

/** 将检索结果绑定到当前席位，避免来源数组跨席位串线。 */
export function withSourceFields(sources: SessionSource[], seat: SeatId): EvidenceFields {
  const fields = sourceFields(sources);
  return { ...fields, sourceSeatIds: sources.map(() => seat) };
}

export function sourceIdsForSeat(sources: SessionSource[], seat: SeatId): string[] {
  return withSourceFields(sources, seat).sourceIds;
}

export function makeRequestMeta(input: Partial<Pick<ApiMeta, "sessionId" | "requestId" | "topicId">>, topicId = "T01"): ApiMeta {
  return {
    // 旧客户端没有元数据时仍可工作；新客户端会传入并得到原样回显。
    sessionId: input.sessionId?.trim() || `sess_${randomUUID()}`,
    requestId: input.requestId?.trim() || `req_${randomUUID()}`,
    topicId: input.topicId?.trim() || topicId,
  };
}

const SEAT_FALLBACKS: Record<SeatId, string> = {
  action: "如果工作已经持续损害身心，继续留下也在产生健康成本。先确认照护、收入和恢复底线；当消耗仍在加剧时，离开可以是止损，但不等于冲动行动。",
  realist: "如果现金储备有限，裸辞可能把工作焦虑转成生活压力。先核对照护安排、固定支出和替代方案，再设一个复查期限；风险控制不等于无限期硬撑。",
  conditional: "先把不可逆的损失、还能保留的选项和下一次复查信号列出来，再决定当前最小但有效的一步。",
};

const CHILD_KEYWORDS = ["孩子", "小孩", "生病", "照护", "住院", "家人", "家庭责任"];

/** 针对新增情境的确定性兜底，确保追问不会退化为无关原文。 */
export function seatFallback(seat: SeatId, question: string, userAddedConditions: string[] = []): string {
  const context = `${question} ${userAddedConditions.join(" ")}`;
  if (CHILD_KEYWORDS.some((keyword) => context.includes(keyword))) {
    if (seat === "action") {
      return "如果孩子生病，照护责任会改变行动顺序：先确认能否请假、谁来照护以及你的身心底线。若工作让你无法照护或状态持续恶化，离开可以是止损，但先安排基本生活与医疗支持。";
    }
    if (seat === "realist") {
      return "如果孩子生病，家庭照护和医疗支出会提高现金流的安全线。先核对可用假期、家庭支持、保险与可承受储备，再决定是否离开；这不是无限期硬撑，而是明确复查期限。";
    }
    return "孩子的照护让判断条件变了：把可用假期、家庭支持、现金流和身心底线列出来，设定复查信号，再决定留下、调整还是离开。";
  }
  return SEAT_FALLBACKS[seat];
}

function seatPrompt(seat: SeatId): string {
  if (seat === "action") return "关注身心健康、不可逆损失与及时止损；行动不等于无计划辞职。";
  if (seat === "realist") return "关注现金流、家庭责任、替代方案与风险边界；不要把风险控制变成无限期忍耐。";
  return "关注可检查的条件、期限和安全线；不要简单重复前两席或给唯一答案。";
}

export type GeneratedReply = {
  reply: string;
  mode: Mode;
};

/**
 * 将检索证据与最新问题交给聊天模型生成新回答。来源只作为证据，不直接充当 reply。
 * 没有配置、超时、空输出或模型异常时统一回到当前席位 fallback。
 */
export async function generateSeatReply(args: {
  topicTitle: string;
  seat: SeatId;
  question: string;
  sources: SessionSource[];
  userAddedConditions?: string[];
  conversationContext?: string;
  fallback?: string;
}): Promise<GeneratedReply> {
  const fallback = args.fallback ?? seatFallback(args.seat, args.question, args.userAddedConditions);
  const client = getAIClient();
  if (!client) return { reply: fallback, mode: "fallback" };
  if (args.sources.length === 0) {
    return { reply: `${fallback}（当前材料不足，以下仅作一般判断框架。）`, mode: "fallback" };
  }

  const evidence = args.sources
    .map((source, index) => `[${index + 1}] ${source.title} — ${source.author}\n${source.contentText.slice(0, 900)}`)
    .join("\n\n");
  const prompt = [
    `固定话题：${args.topicTitle}`,
    `当前席位：${args.seat}`,
    `席位边界：${seatPrompt(args.seat)}`,
    `用户最新问题（必须直接回答）：${args.question}`,
    args.userAddedConditions?.length ? `用户新增条件：${args.userAddedConditions.join("；")}` : "",
    args.conversationContext ? `已发生对话（仅作上下文）：${args.conversationContext}` : "",
    `参考来源（只能用于支撑，不要复制原文）：\n${evidence}`,
    "请用简洁中文回答用户最新问题。明确处理新增情境，说明边界或不确定性；不要冒充答主，不要编造数字。只返回回答正文。",
  ].filter(Boolean).join("\n\n");

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: `你是知识拼桌的${args.seat}席位。${seatPrompt(args.seat)}` },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
    });
    const raw = completion.choices[0]?.message?.content;
    const reply = typeof raw === "string" ? raw.trim().replace(/^```(?:text|markdown)?\s*/i, "").replace(/\s*```$/, "") : "";
    if (!reply) throw new Error("empty model reply");
    return { reply, mode: "generated" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("seat generation fallback:", error);
    return { reply: fallback, mode: "fallback" };
  }
}

export function sessionMode(): Mode {
  return hasAIConfig() ? "generated" : "fallback";
}
