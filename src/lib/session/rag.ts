// src/lib/session/rag.ts
// 会话级 RAG 编排的共享抽象。
//
// 合并记录（两套并行方案取长补短）：
// - retrieveSessionSources：采用 hock1024always 的 try/catch + 在检索层强制
//   `seat` 过滤（比只在响应里标 sourceSeatIds 更早拦住跨席），保留为唯一实现。
// - sourceFields：同时给出 sourceSeats（真实来源席位）+ sourceSeatIds（PRD 10.3 契约）。
// - 移除会撒谎的 sessionMode()（旧实现：有 key 就报 ai，但路由根本没调 LLM）。
//   mode 由 src/lib/session/mode.ts 的 sessionMode(actual) 如实注入。
// - generateSeatReply / generateStructured 保留（队友的接口），但内部改走
//   src/lib/ai/llm.ts 的 callLLM —— 这样自动获得 thinking 开关、JSON 清洗、
//   统一的失败返回 null，不再各自写一份 client.chat.completions.create。

import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import { callLLM } from "@/lib/ai/llm";
import { sessionMode } from "@/lib/session/mode";
import type { SeatId } from "@/lib/types";

export type SessionSource = Awaited<ReturnType<typeof retrieveFromTopics>>[number];

export async function retrieveSessionSources(topicId: string, seat: SeatId, query: string, count = 3) {
  try {
    const queryVec = await embedQuery(query);
    const sources = await retrieveFromTopics(queryVec, { topicId, seat }, count);
    // 早期隔离：检索层就丢掉跨席位的来源，避免下游任何一处漏过滤
    return sources.filter((source) => source.seat === seat);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("session embedding fallback:", error);
    const sources = await retrieveFromTopics(null, { topicId, seat }, count);
    return sources.filter((source) => source.seat === seat);
  }
}

export function sourceExcerpt(source: SessionSource | undefined, fallback: string, max = 210) {
  if (!source) return fallback;
  return source.contentText.replace(/\s+/g, " ").trim().slice(0, max);
}

export function sourceFields(sources: SessionSource[], seat?: SeatId) {
  return {
    sourceIds: sources.map((source) => source.contentId),
    sourceUrls: sources.map((source) => source.url),
    authors: sources.map((source) => source.author),
    // 真实来源席位（由检索层保证 == 请求席位）
    sourceSeats: sources.map((source) => source.seat),
    // PRD 10.3：响应需带来源席位，便于前端/测试断言"没有跨席位"
    sourceSeatIds: sources.map(() => seat ?? "unknown"),
  };
}

// ─────────────────────────────────────────────────────────────
// 席位人设（供 generateSeatReply 使用）
//
// 注意：完整人设与 boundaries 在 src/lib/prompts/seats/persona.ts，
// 那里是 5 个业务动作共用的。这里保留一份精简版，只为兼容
// generateSeatReply 这个接口（它接受的是裸字符串 prompt）。
// 新代码请优先用 src/lib/prompts/actions.ts 的 prompt builder。
// ─────────────────────────────────────────────────────────────
const seatPrompts: Record<"action" | "realist" | "conditional", string> = {
  action: `你是知识拼桌的第一席「行动派」。
关注身心健康、不可逆损失、家庭照护和重新获得选择能力。行动不等于冲动裸辞，要说明最低现金流和可执行边界。`,
  realist: `你是知识拼桌的第二席「现实派」。
关注现金流、医疗或照护支出、家庭责任、替代方案和风险边界。不要把谨慎说成无限期硬撑，要给出期限或触发线。`,
  conditional: `你是知识拼桌的第三席「条件派」。
关注触发条件、期限、安全线和可检查的中间方案，帮助用户把二选一改写成可观察的判断。`,
};

function sourceContext(sources: SessionSource[]) {
  return sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title} · ${source.author}\n${source.contentText.replace(/\s+/g, " ").trim().slice(0, 900)}`,
    )
    .join("\n\n");
}

/**
 * 生成单席回答。
 * 内部走统一 callLLM —— 已固化 thinking=disabled（产品回答都很短，
 * 思维链只会烧预算、拖慢响应，实测无质量收益）。
 */
export async function generateSeatReply({
  topicTitle,
  seat,
  question,
  sources,
  fallback,
}: {
  topicTitle: string;
  seat: "action" | "realist" | "conditional";
  question: string;
  sources: SessionSource[];
  fallback: string;
}): Promise<{ reply: string; mode: ReturnType<typeof sessionMode> }> {
  const result = await callLLM({
    system: `${seatPrompts[seat]}

回答规则：
- 直接回答用户这一次具体问题，不要只摘录或复述来源。
- 必须明确回应用户新提供的条件；如果来源没有覆盖，诚实说明并基于席位原则谨慎推断。
- 不替用户做绝对决定，不编造个人经历、数字或医疗结论。
- 使用简洁自然的中文，控制在 80-180 字。
- 参考来源只用于支撑判断，不要输出来源编号。`,
    user: `当前话题：${topicTitle}
用户追问：${question}

参考来源：
${sourceContext(sources) || "当前席位没有检索到足够的相关来源，请依据席位原则回答，并说明这一点。"}`,
    temperature: 0.35,
    thinking: "disabled",
    maxTokens: 900,
    label: `seatReply:${seat}`,
  });

  if (!result) return { reply: fallback, mode: sessionMode("fallback") };
  return { reply: result.content, mode: sessionMode("generated") };
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
}): Promise<{ value: T; mode: ReturnType<typeof sessionMode> }> {
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
