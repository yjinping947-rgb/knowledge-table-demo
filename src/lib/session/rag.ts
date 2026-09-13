// src/lib/session/rag.ts
// 会话级 RAG 编排的共享抽象。
//
// 变更记录（接通 LLM）：
// - 移除了会撒谎的 sessionMode()（旧实现：有 key 就报 "ai"，但路由根本没调 LLM）。
//   现在 mode 由 src/lib/session/mode.ts 的 sessionMode(actual) 如实注入。
// - sourceFields 增加 sourceSeatIds —— PRD 10.3 要求响应带它，用于校验"来源没跨席位"。

import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import type { SeatId } from "@/lib/types";

export type SessionSource = Awaited<ReturnType<typeof retrieveFromTopics>>[number];

export async function retrieveSessionSources(topicId: string, seat: SeatId, query: string, count = 3) {
  const queryVec = await embedQuery(query);
  return retrieveFromTopics(queryVec, { topicId, seat }, count);
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
    // PRD 10.3：响应需带来源席位，便于前端/测试断言"没有跨席位"
    sourceSeatIds: sources.map(() => seat ?? "unknown"),
  };
}

export type { SeatId };
