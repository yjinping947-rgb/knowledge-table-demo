import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import type { Mode, SeatId } from "@/lib/types";
import { AI_MODEL, getAIClient } from "@/lib/ai";
import { filterRealtimeSourcesForTopic, searchZhihuRealtime, type RealtimeZhihuSource } from "@/lib/zhihu/realtime";

export type SessionSource = Awaited<ReturnType<typeof retrieveFromTopics>>[number];

export type SessionSourceStatus = "zhihu-realtime" | "hybrid" | "local-fallback" | "no-result";

export async function retrieveSessionSourcesDetailed(topicId: string, seat: SeatId, query: string, count = 3, customQuestion?: string) {
  const realtime = await searchZhihuRealtime(query, count);
  if (realtime.status === "ok") {
    const relevant = filterRealtimeSourcesForTopic(topicId, realtime.sources, customQuestion)
      .slice(0, count) as Array<SessionSource & RealtimeZhihuSource>;
    if (relevant.length >= count) {
      return { sources: relevant, status: "zhihu-realtime" as const };
    }

    // 实时结果不足时只从当前 topicId + seat 补齐，不让全站搜索的偏题结果占位。
    const queryVec = await embedQuery(query).catch(() => null);
    const local = await retrieveFromTopics(queryVec, { topicId, seat }, count, { queryText: query });
    const seen = new Set(relevant.map((source) => source.contentId));
    const merged = [
      ...relevant,
      ...local.filter((source) => !seen.has(source.contentId)),
    ].slice(0, count);
    if (relevant.length > 0) return { sources: merged, status: "hybrid" as const };
    return { sources: merged, status: merged.length ? "local-fallback" as const : "no-result" as const };
  }
  let queryVec: number[] | null = null;
  try {
    queryVec = await embedQuery(query);
  } catch {
    // Embedding provider failures must not prevent the local keyword fallback.
    queryVec = null;
  }
  const local = await retrieveFromTopics(queryVec, { topicId, seat }, count, { queryText: query });
  return { sources: local, status: local.length ? "local-fallback" as const : "no-result" as const };
}

export async function retrieveSessionSources(topicId: string, seat: SeatId, query: string, count = 3, customQuestion?: string) {
  return (await retrieveSessionSourcesDetailed(topicId, seat, query, count, customQuestion)).sources;
}

export function sourceExcerpt(source: SessionSource | undefined, fallback: string, max = 210) {
  if (!source) return fallback;
  return source.contentText.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * 本地降级时按当前问题挑选完整句子，避免每次追问都返回同一段原文开头。
 * 这不是 LLM 摘要，只是可解释的句子级抽取；没有命中时才使用普通摘录。
 */
export function sourceExcerptRelevant(
  source: SessionSource | undefined,
  query: string,
  fallback: string,
  max = 210,
) {
  if (!source) return fallback;
  const text = source.contentText.replace(/\s+/g, " ").trim();
  const terms = Array.from(new Set(query.match(/[\u4e00-\u9fff]{2,}|[a-zA-Z0-9]{2,}/g) ?? []))
    .filter((term) => term.length >= 2)
    .slice(0, 30);
  const sentences = text.split(/(?<=[。！？!?；;])\s*/).filter(Boolean);
  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: terms.reduce((sum, term) => sum + (sentence.toLowerCase().includes(term.toLowerCase()) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const best = ranked.find((item) => item.score > 0)?.sentence;
  // 没有任何问题词命中时，不展示看似相关但实际无关的原文；交给席位
  // fallback 句回答，避免把第一次问题的内容伪装成当前问题的答案。
  if (!best) return fallback;
  return best.length <= max ? best : `${best.slice(0, max - 1)}。`;
}

export function sourceFields(sources: SessionSource[], status: SessionSourceStatus = "local-fallback") {
  return {
    sourceIds: sources.map((source) => source.contentId),
    sourceUrls: sources.map((source) => source.url),
    authors: sources.map((source) => source.author),
    sourceStatus: status,
  };
}

export function sessionMode(status: SessionSourceStatus = "local-fallback"): Mode {
  return status === "zhihu-realtime" || status === "hybrid" ? "ai" : "fallback";
}

/** Run a small JSON-only model call for derived stages (divergence/perspective). */
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
      max_tokens: 900,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("empty structured session response");
    const value = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")) as T;
    return { value, mode: "ai" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("structured session generation fallback:", error);
    return { value: fallback, mode: "fallback" };
  }
}
