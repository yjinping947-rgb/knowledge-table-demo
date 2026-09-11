// src/lib/ai/client.ts
// AI 客户端封装。详见 .harness/contracts/discuss.md 与 .harness/agents/director.md。

import OpenAI from "openai";

export function hasAIConfig(): boolean {
  return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL);
}

export function getAIClient(): OpenAI | null {
  if (!hasAIConfig()) return null;
  return new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL,
    timeout: 30_000,
    maxRetries: 1,
  });
}

export const AI_MODEL: string = process.env.AI_MODEL || "qwen3-vl-flash";
