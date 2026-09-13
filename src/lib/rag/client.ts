// src/lib/rag/client.ts
// RAG 用的 embedding 客户端。复用 src/lib/ai 的 client 思路。

import OpenAI from "openai";

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (cachedClient !== null) return cachedClient;
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL;
  if (!apiKey || !baseURL) {
    cachedClient = null;
    return null;
  }
  cachedClient = new OpenAI({ apiKey, baseURL, timeout: 30_000, maxRetries: 1 });
  return cachedClient;
}

/**
 * 取 query 向量。embedding 不可用时一律返回 null，由调用方降级为关键词排序。
 *
 * 关键：网关可能只代理 chat/completions、不提供 /embeddings（如 DeepSeek），
 * 此时请求会 404 抛错。这里必须吞掉异常而不是向上抛——否则配了 key 反而让
 * 接口 500，比不配 key 还糟（缺 key 时 getClient 返回 null，是静默降级的）。
 *
 * 失败会被缓存为"不可用"，避免每次请求都白等一次 404。
 */
let embedUnavailable = false;

export async function embedQuery(text: string): Promise<number[] | null> {
  if (embedUnavailable) return null;
  const client = getClient();
  if (!client) return null;
  try {
    const r = await client.embeddings.create({
      model: EMBED_MODEL,
      input: text.slice(0, 8000),
    });
    return r.data[0]?.embedding ?? null;
  } catch (error) {
    embedUnavailable = true;
    if (process.env.NODE_ENV === "development") {
      console.warn("[rag] embedding 不可用，降级为关键词检索:", (error as Error)?.message);
    }
    return null;
  }
}

/** 供测试/诊断用：embedding 是否已被判定为不可用 */
export function isEmbeddingUnavailable(): boolean {
  return embedUnavailable;
}

export { EMBED_MODEL, EMBED_DIM };
