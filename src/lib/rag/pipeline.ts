// src/lib/rag/pipeline.ts
// 完整 RAG pipeline：用户问题 → embedding → 检索 → 拼 prompt → LLM 回答。
// 支持 roomId：进入特定房间时只检索该房间的语料，并注入作者化的人设。

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { embedQuery } from "./client";
import { retrieveTopK, loadCorpus, type RagItem } from "./retrieve";

export type RagResult = {
  answer: string;
  reasoningContent: string;
  retrieved: Array<RagItem & { score: number }>;
  mode: "ai" | "fallback";
};

export type Room = {
  id: string;
  title: string;
  author: string;
  excerpt: string;
  sourceUrl: string;
  corpusId: string;
  voteUpCount: number;
  commentCount: number;
};

let cachedRooms: Room[] | null = null;
async function loadRooms(): Promise<Room[]> {
  if (cachedRooms !== null) return cachedRooms;
  const data: Room[] = JSON.parse(
    await readFile(resolve(process.cwd(), "src/data/rooms.json"), "utf8"),
  );
  cachedRooms = data;
  return data;
}

export async function getRoom(roomId: string): Promise<Room | undefined> {
  const rooms = await loadRooms();
  return rooms.find((r) => r.id === roomId);
}

export async function listRooms(): Promise<Room[]> {
  return loadRooms();
}

const RAG_SYSTEM_PROMPT_DEFAULT = `你是"知识拼桌"的 RAG 助手。回答必须：
1. 基于下方"参考来源"中的真实知乎回答
2. 引用具体来源（标注作者/标题）
3. 避免编造个人经历、数字、公司名
4. 100-200 个汉字之间
5. 不要 code fence，不要解释过程，只给答案`;

function buildRoomSystemPrompt(room: Room): string {
  return `你是"知识拼桌"房间 ${room.id} 的主持人，代号「${room.author}」。

你的核心立场和写作风格来自这条知乎回答（节选 / 完整内容会在 user 消息的 [1] 位置给你）：
"""
${room.excerpt}
"""

回答规则：
1. 必须站在「${room.author}」的立场和语气回答
2. 保留原作者的写作风格（口语化/数据驱动/反思/经验分享等）
3. 不编造个人经历、数字、公司名
4. 100-200 个汉字之间
5. 引用 user 消息里 [1] 位置的内容标注 [${room.author}]；引用 [2]/[3] 等标注作者
6. 立场若超出你语料覆盖范围，明确说"这条我没看到，不在你给的范围内"`;
}

export async function runRag(question: string, k = 4, roomId?: string): Promise<RagResult> {
  const fallbackAnswer = roomId
    ? `（fallback 模式：未配置 LLM）房间 ${roomId} 的问题：${question}`
    : `（fallback 模式：未配置 LLM）问题：${question}`;

  // 1. 加载房间（如果指定）
  let room: Room | undefined;
  if (roomId) {
    room = await getRoom(roomId);
    if (!room) {
      return { answer: `房间 ${roomId} 不存在`, reasoningContent: "", retrieved: [], mode: "fallback" };
    }
  }

  // 2. Embedding
  const queryVec = await embedQuery(question);

  // 3. 检索。没有 embedding 时仍返回语料来源，保证 fallback 也有可解释的上下文。
  const allRetrieved = queryVec
    ? await retrieveTopK(queryVec, k * 3)
    : (await loadCorpus()).map((item) => ({ ...item, score: 0 }));
  // 房间模式：room 自己的语料强制在 top[0]（人设核心），其余按相似度
  let top: Array<RagItem & { score: number }>;
  if (room) {
    const all = await loadCorpus();
    const roomItem = all.find((c) => c.contentId === room.corpusId);
    const others = allRetrieved.filter((it) => it.contentId !== room.corpusId);
    top = roomItem
      ? [{ ...roomItem, score: 1.0 }, ...others].slice(0, k)
      : allRetrieved.slice(0, k);
  } else {
    top = allRetrieved.slice(0, k);
  }
  if (top.length === 0) {
    return { answer: fallbackAnswer, reasoningContent: "", retrieved: [], mode: "fallback" };
  }

  // 4. 拼 system prompt（房间模式下注入完整语料作为人设核心）
  const systemPrompt = room ? buildRoomSystemPrompt(room) : RAG_SYSTEM_PROMPT_DEFAULT;

  // 5. 拼 user prompt（top[0] 是房间自己的语料完整给，其他 600 字）
  const context = top
    .map((it, i) => {
      const text = i === 0 ? it.contentText : it.contentText.slice(0, 600);
      return `[${i + 1}] ${it.title} — ${it.author}\n${text}`;
    })
    .join("\n\n");
  const userPrompt = `参考来源：\n${context}\n\n用户问题：${question}`;

  // 6. 调 LLM
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
        { role: "system", content: systemPrompt },
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
