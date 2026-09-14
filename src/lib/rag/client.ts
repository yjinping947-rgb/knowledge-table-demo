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
  cachedClient = new OpenAI({ apiKey, baseURL, timeout: 8_000, maxRetries: 0 });
  return cachedClient;
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const r = await client.embeddings.create({
      model: process.env.AI_EMBEDDING_MODEL || EMBED_MODEL,
      input: text.slice(0, 8000),
    });
    return r.data[0]?.embedding ?? null;
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Embedding fallback:", error);
    return null;
  }
}

export { EMBED_MODEL, EMBED_DIM };
