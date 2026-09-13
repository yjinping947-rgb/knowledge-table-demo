// src/lib/session/mode.ts
// 如实的模式标注。
//
// 修复原 src/lib/session/rag.ts 里 sessionMode() 的撒谎 bug：
//   旧：return hasAIConfig() ? "ai" : "fallback"  ← 有 key 就报 ai，但根本没调 LLM
//   新：由调用方显式说明这次到底发生了什么
//
// PRD 10.2 要求三值：
//   generated  检索证据后由模型生成
//   retrieval  仅返回来源摘录（必须显式标注）
//   fallback   无 API / 超时 / 失败时的规则兜底

export type SessionMode = "generated" | "retrieval" | "fallback";

/**
 * 如实汇报本次响应的产生方式。
 * @param mode 本次实际走的路径，由调用方根据"LLM 是否真的返回了内容"决定
 */
export function sessionMode(mode: SessionMode): SessionMode {
  return mode;
}

/** 保留旧签名兼容：不再凭 hasAIConfig 猜测，一律报 fallback 直到被显式覆盖。 */
export function legacySessionMode(): SessionMode {
  return "fallback";
}
