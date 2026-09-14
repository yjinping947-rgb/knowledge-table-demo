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
    // 互动席位不应因一次慢请求把整桌卡住；失败后由当前阶段的
    // 本地语料/固定兜底继续完成流程。
    timeout: 12_000,
    maxRetries: 0,
  });
}

export const AI_MODEL: string = process.env.AI_MODEL || "qwen3-vl-flash";
