import { hasAIConfig } from "@/lib/ai/client";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import type { Mode, SeatId } from "@/lib/types";

export type SessionSource = Awaited<ReturnType<typeof retrieveFromTopics>>[number];

export async function retrieveSessionSources(topicId: string, seat: SeatId, query: string, count = 3) {
  const queryVec = await embedQuery(query);
  return retrieveFromTopics(queryVec, { topicId, seat }, count);
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
  };
}

export function sessionMode(): Mode {
  return hasAIConfig() ? "ai" : "fallback";
}
