// src/lib/rag/topics.ts
// 20 话题 × 3 派 的真实知乎语料检索。
// 数据在 src/data/topics.json（结构：{ T01: { id, title, seats: { action: [...], realist: [...], conditional: [...] } } }）。
//
// 检索策略：
// 1. 优先用 src/data/topic-embeddings.json（如果存在）做 cosine similarity
// 2. 不存在 embedding 时，按 (authorityLevel desc, keyword 命中数 desc, voteUpCount desc) 排序
// 这样保证 demo 在没跑过 embedding 也能跑通。
//
// 详见 .harness/AGENTS.md 第 4 节。

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type TopicSource = {
  contentId: string;
  title: string;
  author: string;
  contentText: string;
  url: string;
  voteUpCount: number;
  commentCount: number;
  authorityLevel: number;
};

export type Topic = {
  id: string;
  title: string;
  seats: {
    action: TopicSource[];
    realist: TopicSource[];
    conditional: TopicSource[];
  };
};

export type TopicEmbedding = {
  topicId: string;
  seat: "action" | "realist" | "conditional";
  contentId: string;
  embedding: number[];
};

// 简化的关键词列表：第一轮 / 第二轮不同 query 的关键词
const FIRST_KEYWORDS: Record<string, string[]> = {
  support_quit: ["立刻辞", "马上辞", "止损", "走", "身心", "崩溃", "裸辞", "尊严", "健康"],
  oppose_quit: ["不建议", "谨慎", "骑驴找马", "offer", "空窗", "收入", "家庭"],
  depends: ["看情况", "条件", "状态", "方向", "过渡", "安全线"],
};
const SECOND_KEYWORDS: Record<string, string[]> = {
  leave_now: ["立刻辞", "马上辞", "止损", "恢复状态", "裸辞"],
  wait_offer: ["骑驴找马", "拿到 offer", "新工作", "求职", "面试"],
  set_deadline: ["期限", "过渡", "观察", "请假", "降低投入"],
};

let cachedTopics: Record<string, Topic> | null = null;
let cachedEmbeddings: TopicEmbedding[] | null = null;
const cachedTopicsList: Array<{ id: string; title: string; sourceCount: number }> | null = null;

export async function loadTopics(): Promise<Record<string, Topic>> {
  if (cachedTopics !== null) return cachedTopics;
  const path = resolve(process.cwd(), "src/data/topics.json");
  const raw: Record<string, Topic> = JSON.parse(await readFile(path, "utf8"));
  cachedTopics = raw;
  return raw;
}

export type TopicSummary = {
  id: string;
  title: string;
  sourceCount: number;
};

export async function listTopics(): Promise<TopicSummary[]> {
  const topics = await loadTopics();
  return Object.values(topics).map((t) => ({
    id: t.id,
    title: t.title,
    sourceCount: t.seats.action.length + t.seats.realist.length + t.seats.conditional.length,
  }));
}

export async function loadTopicEmbeddings(): Promise<TopicEmbedding[] | null> {
  if (cachedEmbeddings !== null) return cachedEmbeddings;
  try {
    const path = resolve(process.cwd(), "src/data/topic-embeddings.json");
    const data: TopicEmbedding[] = JSON.parse(await readFile(path, "utf8"));
    cachedEmbeddings = data;
    return data;
  } catch {
    cachedEmbeddings = [];
    return null;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

function keywordScore(text: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) hits++;
  }
  return hits;
}

/**
 * 检索 top-K 真实知乎语料。
 * - 限定 topicId（如 "T01"）和 seat（如 "action"）。
 * - 优先用 embedding 算 cosine；没有 embedding 时退化为 authorityLevel + 关键词排序。
 */
export async function retrieveFromTopics(
  queryVec: number[] | null,
  filter: { topicId: string; seat?: "action" | "realist" | "conditional" },
  k: number,
  hint?: { firstChoice?: string; secondChoice?: string; round?: 1 | 2 },
): Promise<Array<TopicSource & { score: number }>> {
  const topics = await loadTopics();
  const topic = topics[filter.topicId];
  if (!topic) return [];

  const seatsToSearch: Array<"action" | "realist" | "conditional"> = filter.seat
    ? [filter.seat]
    : ["action", "realist", "conditional"];

  const candidates: TopicSource[] = [];
  for (const s of seatsToSearch) {
    for (const src of topic.seats[s]) {
      candidates.push(src);
    }
  }

  // 1) 尝试 embedding cosine
  const embeddings = (await loadTopicEmbeddings()) ?? [];
  const filteredEmbeddings = embeddings.filter(
    (e) => e.topicId === filter.topicId && (!filter.seat || e.seat === filter.seat),
  );

  if (queryVec && filteredEmbeddings.length > 0) {
    const scored = candidates
      .map((src) => {
        const emb = filteredEmbeddings.find((e) => e.contentId === src.contentId);
        const score = emb ? cosine(queryVec, emb.embedding) : 0;
        return { ...src, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  // 2) Fallback: authorityLevel + 关键词命中 + 投票
  const keywords = hint
    ? hint.round === 2
      ? SECOND_KEYWORDS[hint.secondChoice ?? ""] ?? []
      : FIRST_KEYWORDS[hint.firstChoice ?? ""] ?? []
    : [];

  const scored = candidates.map((src) => {
    const kw = keywordScore(src.contentText + " " + src.title, keywords);
    const score = src.authorityLevel * 1000 + kw * 50 + src.voteUpCount * 0.1;
    return { ...src, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
