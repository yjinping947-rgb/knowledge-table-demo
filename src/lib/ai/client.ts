// src/lib/ai/client.ts
// AI 客户端封装。详见 .harness/contracts/discuss.md 与 .harness/agents/director.md。
//
// 配置来源已改为 src/lib/ai/config.ts —— 它统一了"环境变量"与"页面填写"两条路径，
// 并让页面填的 key 无需重启即可生效。这里只负责把配置变成 OpenAI 客户端。

import OpenAI from "openai";
import { getAiConfig } from "./config";

export function hasAIConfig(): boolean {
  const { apiKey, baseUrl } = getAiConfig();
  return Boolean(apiKey && baseUrl);
}

export function getAIClient(): OpenAI | null {
  if (!hasAIConfig()) return null;
  const { apiKey, baseUrl } = getAiConfig();
  return new OpenAI({
    apiKey,
    baseURL: baseUrl,
    timeout: 30_000,
    maxRetries: 1,
  });
}

/** 模型名。每次读取，确保页面改模型后立即生效。 */
export function getAIModel(): string {
  return getAiConfig().model;
}
