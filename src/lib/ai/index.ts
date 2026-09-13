// src/lib/ai/index.ts
export { AI_MODEL, hasAIConfig, getAIClient } from "./client";
export {
  callLLM,
  callLLMJson,
  extractJson,
  type LlmCallOptions,
  type LlmResult,
  type LlmUsage,
} from "./llm";
export {
  getSession,
  upsertSession,
  appendFollowup,
  deriveSessionId,
  renderSessionContext,
  type SessionState,
  type SeatStatement,
  type FollowupRecord,
  type CollisionRecord,
} from "./session";
export type { ChatRole, ChatMessage } from "./types";
