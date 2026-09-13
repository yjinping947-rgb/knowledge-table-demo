import { AI_MODEL, getAIClient, hasAIConfig } from "@/lib/ai/client";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import type { Mode, SeatId } from "@/lib/types";

export type SessionSource = Awaited<ReturnType<typeof retrieveFromTopics>>[number];

export async function retrieveSessionSources(topicId: string, seat: SeatId, query: string, count = 3) {
  try {
    const queryVec = await embedQuery(query);
    const sources = await retrieveFromTopics(queryVec, { topicId, seat }, count);
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

export function sourceFields(sources: SessionSource[]) {
  return {
    sourceIds: sources.map((source) => source.contentId),
    sourceUrls: sources.map((source) => source.url),
    authors: sources.map((source) => source.author),
    sourceSeats: sources.map((source) => source.seat),
  };
}

export function sessionMode(): Mode {
  return hasAIConfig() ? "generated" : "fallback";
}

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
}): Promise<{ reply: string; mode: Mode }> {
  const client = getAIClient();
  if (!client) return { reply: fallback, mode: "fallback" };

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `${seatPrompts[seat]}

回答规则：
- 直接回答用户这一次具体问题，不要只摘录或复述来源。
- 必须明确回应用户新提供的条件；如果来源没有覆盖，诚实说明并基于席位原则谨慎推断。
- 不替用户做绝对决定，不编造个人经历、数字或医疗结论。
- 使用简洁自然的中文，控制在 80-180 字。
- 参考来源只用于支撑判断，不要输出来源编号。`,
        },
        {
          role: "user",
          content: `当前话题：${topicTitle}
用户追问：${question}

参考来源：
${sourceContext(sources) || "当前席位没有检索到足够的相关来源，请依据席位原则回答，并说明这一点。"}`,
        },
      ],
    });
    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error("empty session model reply");
    return { reply, mode: "generated" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("session generation fallback:", error);
    return { reply: fallback, mode: "fallback" };
  }
}

export async function generateStructured<T>({
  system,
  user,
  fallback,
}: {
  system: string;
  user: string;
  fallback: T;
}): Promise<{ value: T; mode: Mode }> {
  const client = getAIClient();
  if (!client) return { value: fallback, mode: "fallback" };

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.25,
      messages: [
        { role: "system", content: `${system}\n只输出合法 JSON，不要 Markdown 代码块。` },
        { role: "user", content: user },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("empty structured session response");
    const value = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")) as T;
    return { value, mode: "generated" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("structured session generation fallback:", error);
    return { value: fallback, mode: "fallback" };
  }
}
