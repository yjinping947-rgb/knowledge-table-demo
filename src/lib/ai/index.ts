// src/lib/ai/index.ts
export { getAIModel, hasAIConfig, getAIClient } from "./client";
export {
  getAiConfig,
  getAiStatus,
  isAiConfigured,
  saveAiConfig,
  clearAiOverride,
  maskKey,
  validateApiKey,
  validateBaseUrl,
  validateModel,
  hasControlChars,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  type AiRuntimeConfig,
} from "./config";
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
