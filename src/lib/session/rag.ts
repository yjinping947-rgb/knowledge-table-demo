// src/lib/session/rag.ts
// 会话级 RAG 编排的共享抽象。
//
// 合并记录（三条实现线取长补短）：
// - retrieveSessionSources：采用队长版把「问题本身」作为 hint.query 传进检索
//   （中文无空格，二元切分参与排序，避免每次追问都退化成同一批高权威来源），
//   同时保留本分支的检索层席位过滤 + 无向量重试。
// - sourceFields / withSourceFields：同时给出 sourceSeats（真实来源席位）
//   与 sourceSeatIds（PRD 10.3 契约），并保留队长版"绑定当前席位"的语义。
// - 采用队长版的 makeRequestMeta / seatFallback / seatPrompt / GeneratedReply。
// - generateSeatReply：采用队长版签名（userAddedConditions / conversationContext），
//   但内部改走 src/lib/ai/llm.ts 的 callLLM —— 从而固化 thinking=disabled。
//   队长原实现直接调 client.chat.completions.create 且不传 thinking，
//   会跑在 DeepSeek 默认思考模式下（实测 9.1s / 1832 思维链 token）。
// - 移除会撒谎的旧 sessionMode()（有 key 就报 ai，但路由根本没调 LLM）。
//   mode 由 src/lib/session/mode.ts 的 sessionMode(actual) 如实注入。

import { randomUUID } from "node:crypto";

import { callLLM } from "@/lib/ai/llm";
import { renderPersona, seatNames } from "@/lib/prompts/seats/persona";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import { sessionMode } from "@/lib/session/mode";
import type { ApiMeta, EvidenceFields, Mode, SeatId } from "@/lib/types";

export type SessionSource = Awaited<ReturnType<typeof retrieveFromTopics>>[number];

/**
 * 检索是可失败的外部边界。将异常收敛为空数组，调用方才能选择当前席位的安全兜底，
 * 而不是把 embedding 服务的错误暴露给用户或误用上一轮来源。
 */
export async function retrieveSessionSources(topicId: string, seat: SeatId, query: string, count = 3) {
  // hint.query 交给关键词降级路径打分（队长版改进）
  const hint = { query };
  try {
    const queryVec = await embedQuery(query);
    const sources = await retrieveFromTopics(queryVec, { topicId, seat }, count, hint);
    // 早期隔离：检索层就丢掉跨席位的来源，避免下游任何一处漏过滤
    return sources.filter((source) => source.seat === seat);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("session embedding fallback:", error);
    try {
      const sources = await retrieveFromTopics(null, { topicId, seat }, count, hint);
      return sources.filter((source) => source.seat === seat);
    } catch (inner) {
      if (process.env.NODE_ENV === "development") console.error("session retrieval failed:", inner);
      return [];
    }
  }
}

export function sourceExcerpt(source: SessionSource | undefined, fallback: string, max = 210) {
  if (!source) return fallback;
  return source.contentText.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * 统一证据字段。注意 seat 参数可选：
 * - 不传时 only sourceSeats 有真实值（来自检索结果本身）
 * - 传了则把 sourceSeatIds 也绑成该席位（配合 withSourceFields 使用）
 */
export function sourceFields(sources: SessionSource[], seat?: SeatId): EvidenceFields & { sourceSeats: SeatId[] } {
  return {
    sourceIds: sources.map((source) => source.contentId),
    sourceUrls: sources.map((source) => source.url),
    authors: sources.map((source) => source.author),
    // 真实来源席位（由检索结果自带）
    sourceSeats: sources.map((source) => source.seat),
    // PRD 10.3：响应需带来源席位，便于前端/测试断言"没有跨席位"
    sourceSeatIds: seat ? sources.map(() => seat) : sources.map((source) => source.seat),
  };
}

/** 将检索结果绑定到当前席位，避免来源数组跨席位串线。 */
export function withSourceFields(sources: SessionSource[], seat: SeatId): EvidenceFields {
  return sourceFields(sources, seat);
}

export function sourceIdsForSeat(sources: SessionSource[], seat: SeatId): string[] {
  return withSourceFields(sources, seat).sourceIds;
}

export function makeRequestMeta(
  input: Partial<Pick<ApiMeta, "sessionId" | "requestId" | "topicId">>,
  topicId = "T01",
): ApiMeta {
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

export type GeneratedReply = {
  reply: string;
  mode: Mode;
};

/**
 * 将检索证据与最新问题交给聊天模型生成新回答。来源只作为证据，不直接充当 reply。
 * 没有配置、超时、空输出或模型异常时统一回到当前席位 fallback。
 *
 * ⚠️ 统一走 callLLM 并固化 thinking=disabled：
 * 产品回答都在 100-200 字，思维链只烧预算、拖慢响应（实测 9.1s→1.7s，1832→0 token），
 * 质量无差别。这也是"全链路不要深度思考模式"的落点之一。
 */
export async function generateSeatReply(args: {
  topicTitle: string;
  seat: SeatId;
  question: string;
  sources: SessionSource[];
  userAddedConditions?: string[];
  conversationContext?: string;
  fallback?: string;
  /**
   * 正文长度上限（汉字数）。契约 .harness/evals/branches.json 规定 reply ≤ 320，
   * 默认取 260 留出安全余量。模型经常不受"简洁"这类软约束控制，所以除了写进
   * prompt，还会在句末做一次硬截断兜底。
   */
  maxChars?: number;
}): Promise<GeneratedReply> {
  const fallback = args.fallback ?? seatFallback(args.seat, args.question, args.userAddedConditions);
  const limit = args.maxChars ?? 260;
  if (args.sources.length === 0) {
    return { reply: `${fallback}（当前材料不足，以下仅作一般判断框架。）`, mode: sessionMode("fallback") };
  }

  const evidence = args.sources
    .map((source, index) => `[${index + 1}] ${source.title} — ${source.author}\n${source.contentText.slice(0, 900)}`)
    .join("\n\n");

  const user = [
    `固定话题：${args.topicTitle}`,
    `当前席位：${seatNames[args.seat]}（seatId=${args.seat}）`,
    `用户最新问题（必须直接回答）：${args.question}`,
    args.userAddedConditions?.length ? `用户新增条件：${args.userAddedConditions.join("；")}` : "",
    args.conversationContext ? `已发生对话（仅作上下文）：${args.conversationContext}` : "",
    `参考来源（只能用于支撑，不要复制原文）：\n${evidence}`,
    `请用简洁中文回答用户最新问题，全文不超过 ${limit} 个汉字，不要写小标题或列表。明确处理新增情境，说明边界或不确定性；不要冒充答主，不要编造数字。只返回回答正文。`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callLLM({
    // ⚠️ 用完整人设（stance + 论据 + 边界 + 语气 + 8 条通用铁律），不要退化成
    // 队长原实现的一行 seatPrompt —— 那样三个席位会越答越像，丧失"不串味"这个卖点。
    // 具体表现：行动派会开始用"算清现金流能撑几个月"这类算账式表达（铁律第 3 条禁止）。
    system: renderPersona(args.seat),
    user,
    temperature: 0.35,
    thinking: "disabled",
    maxTokens: 900,
    label: `seatReply:${args.seat}`,
  });

  if (!result) return { reply: fallback, mode: sessionMode("fallback") };
  const cleaned = result.content.replace(/^```(?:text|markdown)?\s*/i, "").replace(/\s*```$/, "").trim();
  if (!cleaned) return { reply: fallback, mode: sessionMode("fallback") };
  return { reply: clampLength(cleaned, limit), mode: sessionMode("generated") };
}

/**
 * 超长时在句末截断，避免留下半句话。
 * 模型对"字数"这类软约束并不总是听话，所以这里做硬兜底以保证契约成立。
 */
function clampLength(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const stops = ["。", "！", "？", "；", "…"];
  const lastStop = Math.max(...stops.map((stop) => cut.lastIndexOf(stop)));
  // 截断点至少要保留一半内容，否则宁可硬切也不要只剩一句半
  return lastStop >= Math.floor(limit / 2) ? cut.slice(0, lastStop + 1) : cut;
}

/**
 * 生成结构化 JSON。
 * 同样走统一 callLLM（含 extractJson 清洗 + response_format=json_object）。
 */
export async function generateStructured<T>({
  system,
  user,
  fallback,
}: {
  system: string;
  user: string;
  fallback: T;
}): Promise<{ value: T; mode: Mode }> {
  const result = await callLLM({
    system: `${system}\n只输出合法 JSON，不要 Markdown 代码块。`,
    user,
    json: true,
    temperature: 0.25,
    thinking: "disabled",
    maxTokens: 1000,
    label: "structured",
  });

  if (!result) return { value: fallback, mode: sessionMode("fallback") };
  try {
    return { value: JSON.parse(result.content) as T, mode: sessionMode("generated") };
  } catch {
    return { value: fallback, mode: sessionMode("fallback") };
  }
}

export type { SeatId };
