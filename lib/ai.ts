import OpenAI from "openai";

export function hasAIConfig() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL);
}

export function getAIClient() {
  if (!hasAIConfig()) return null;
  return new OpenAI({ apiKey: process.env.AI_API_KEY, baseURL: process.env.AI_BASE_URL, timeout: 12_000, maxRetries: 1 });
}

export const AI_MODEL = process.env.AI_MODEL || "qwen3-vl-flash";
