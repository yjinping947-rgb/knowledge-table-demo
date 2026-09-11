// src/lib/rag/pipeline.ts
// 完整 RAG pipeline：用户问题 → embedding → 检索 → 拼 prompt → LLM 回答。

import { embedQuery } from "./client";
import { retrieveTopK, type RagItem } from "./retrieve";

export type RagResult = {
  answer: string;
  reasoningContent: string;
  retrieved: Array<RagItem & { score: number }>;
  mode: "ai" | "fallback";
};

const RAG_SYSTEM_PROMPT = `你是"知识拼桌"的 RAG 助手。回答必须：
1. 基于下方"参考来源"中的真实知乎回答
2. 引用具体来源（标注作者/标题）
3. 避免编造个人经历、数字、公司名
4. 100-200 个汉字之间
5. 不要 code fence，不要解释过程，只给答案`;

export async function runRag(question: string, k = 4): Promise<RagResult> {
  const fallbackAnswer = `（fallback 模式：未配置 LLM）问题：${question}`;
  const queryVec = await embedQuery(question);
  if (!queryVec) {
    return { answer: fallbackAnswer, reasoningContent: "", retrieved: [], mode: "fallback" };
  }
  const top = await retrieveTopK(queryVec, k);
  if (top.length === 0) {
    return { answer: fallbackAnswer, reasoningContent: "", retrieved: [], mode: "fallback" };
  }

  // 拼 prompt：参考来源 + 用户问题
  const context = top
    .map((it, i) => `[${i + 1}] ${it.title} — ${it.author}\n${it.contentText.slice(0, 600)}`)
    .join("\n\n");

  const userPrompt = `参考来源：\n${context}\n\n用户问题：${question}`;

  // 调 LLM
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL || "qwen3-vl-flash";
  if (!apiKey || !baseURL) {
    return { answer: fallbackAnswer, reasoningContent: "", retrieved: top, mode: "fallback" };
  }

  const r = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: RAG_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });
  if (!r.ok) {
    return { answer: fallbackAnswer, reasoningContent: "", retrieved: top, mode: "fallback" };
  }
  const j = await r.json();
  const answer = j.choices?.[0]?.message?.content ?? fallbackAnswer;
  const reasoningContent = j.choices?.[0]?.message?.reasoning_content ?? "";
  return { answer, reasoningContent, retrieved: top, mode: "ai" };
}
