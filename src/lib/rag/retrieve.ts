// src/lib/rag/retrieve.ts
// 用 embedding 做 cosine similarity 检索 top-K 语料。
// 详见 .harness/AGENTS.md 第 4 节（核心约束：UI 不变、缺 key 走 fallback、key 不进客户端）。

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type RagItem = {
  contentId: string;
  title: string;
  author: string;
  contentText: string;
  url: string;
  voteUpCount: number;
  commentCount: number;
};

export type RagEmbedding = {
  contentId: string;
  title: string;
  author: string;
  embedding: number[];
};

// 项目内嵌 corpus 索引
let cachedCorpus: RagItem[] | null = null;
let cachedEmbeddings: RagEmbedding[] | null = null;

async function loadCorpus(): Promise<RagItem[]> {
  if (cachedCorpus !== null) return cachedCorpus;
  const path = resolve(process.cwd(), "src/data/rag-corpus.json");
  const data: RagItem[] = JSON.parse(await readFile(path, "utf8"));
  cachedCorpus = data;
  return data;
}

async function loadEmbeddings(): Promise<RagEmbedding[]> {
  if (cachedEmbeddings !== null) return cachedEmbeddings;
  const path = resolve(process.cwd(), "src/data/rag-embeddings.json");
  const data: RagEmbedding[] = JSON.parse(await readFile(path, "utf8"));
  cachedEmbeddings = data;
  return data;
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

export async function retrieveTopK(queryEmbedding: number[], k: number): Promise<Array<RagItem & { score: number }>> {
  const [corpus, embeddings] = await Promise.all([loadCorpus(), loadEmbeddings()]);
  const scored = embeddings.map((e) => ({
    item: corpus.find((c) => c.contentId === e.contentId)!,
    score: cosine(queryEmbedding, e.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((x) => ({ ...x.item, score: x.score }));
}
