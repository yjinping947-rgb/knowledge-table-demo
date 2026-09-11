// src/lib/ai/types.ts
// AI 服务相关类型。预留扩展。

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};
