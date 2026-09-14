// src/lib/ai/llm.ts
// 统一的 LLM 调用封装。5 个业务动作（追问 / 质疑 / 回应 / 分歧 / 第三席+总结）全部走这里。
//
// 设计要点：
// 1. 一次请求 = 一个动作，用 prompt 区分，不用多个模型。
// 2. JSON 动作统一走 response_format=json_object，并有"解析失败即降级"的兜底。
// 3. 思维链（reasoning_tokens）会显著放大计费与延迟（实测 flash 出 30 字烧 2700 token），
//    因此统一把 max_tokens 收紧、temperature 按动作调，避免模型自由发挥。
// 4. 任何失败都返回 null，由调用方走项目既有的 fallback，绝不向上抛。

import { getAIClient, getAIModel } from "./client";

export type LlmCallOptions = {
  system: string;
  user: string;
  /** 期望 JSON 输出时填 true —— 会启用 response_format 并做清洗 */
  json?: boolean;
  temperature?: number;
  /**
   * 输出 token 上限。语义随 thinking 变化：
   * - thinking=disabled：这就是正文长度上限（默认 900 足够）
   * - thinking=enabled：这是思维链 + 正文的总预算。
   *   实测思维链长度不可控（750-4000+ token），给少了会 finish_reason=length
   *   且 content 为空字符串。所以思考模式下强制 ≥ 2000，默认 3000。
   */
  maxTokens?: number;
  /**
   * 思考模式开关（DeepSeek 专有，默认 disabled）。
   *
   * 实测对比同一个"找隐藏分歧"任务：
   *   enabled  → 输出 2112 token（思维链 1999），耗时 13.8s，有返回空字符串的风险
   *   disabled → 输出 116 token（无思维链），耗时约 1.5s，结果质量相当
   *
   * 所以：需要深度推理的任务（碰撞质疑/回应、第三席重构）用 enabled；
   *       结构化抽取类任务（隐藏分歧候选、结果卡字段）用 disabled。
   */
  thinking?: "enabled" | "disabled";
  /** 诊断用的动作标签，只进日志 */
  label?: string;
};

export type LlmUsage = {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
};

export type LlmResult = {
  content: string;
  /** 本次是否走了思考模式 */
  thinking: boolean;
  usage: LlmUsage;
  latencyMs: number;
};

/** 剥掉 ```json 围栏、取第一个完整 JSON 对象。思维链模型偶尔会在 JSON 前后加解释。 */
export function extractJson(text: string): string {
  const fenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const trimmed = fenced.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    // 截到最后一个闭合括号，丢掉尾随废话
    const lastBrace = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (lastBrace > 0) return trimmed.slice(0, lastBrace + 1);
    return trimmed;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

/** 单次调用。失败/超时/空响应一律返回 null。 */
export async function callLLM(options: LlmCallOptions): Promise<LlmResult | null> {
  const client = getAIClient();
  if (!client) return null;

  // 是否启用思考模式（默认关闭）
  const thinking = options.thinking ?? "disabled";
  const isThinking = thinking === "enabled";

  // max_tokens 语义随模式变化：
  //   非思考：这个值 = 正文长度上限，小一点没关系
  //   思考：  这个值 = 思维链 + 正文，且思维链长度不可控（实测 750-4000+）
  //           所以必须给足，否则 finish_reason=length 且 content 为空
  const fallbackMax = isThinking ? 3000 : 900;

  const t0 = Date.now();
  try {
    const completion = await client.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      // ⚠️ 思考模式下 temperature / presence_penalty / frequency_penalty 不生效
      // （官方文档明示：设置不报错但被忽略）。非思考模式才有效。
      ...(isThinking ? {} : { temperature: options.temperature ?? 0.7 }),
      max_tokens: Math.max(options.maxTokens ?? fallbackMax, isThinking ? 2000 : 300),
      ...(options.json ? { response_format: { type: "json_object" as const } } : {}),
      // DeepSeek 思考模式开关（OpenAI SDK 需走 extra_body）
      ...({ thinking: { type: thinking } } as Record<string, unknown>),
    } as never);

    const raw = completion.choices[0]?.message?.content ?? "";
    const content = options.json ? extractJson(raw) : raw.trim();
    if (!content) return null;

    // usage 里 reasoning_tokens 是思维链消耗，单独记账便于成本核算
    const usageRaw = (completion.usage ?? {}) as {
      prompt_tokens?: number;
      completion_tokens?: number;
      completion_tokens_details?: { reasoning_tokens?: number };
    };

    const result: LlmResult = {
      content,
      thinking: isThinking,
      usage: {
        promptTokens: usageRaw.prompt_tokens ?? 0,
        completionTokens: usageRaw.completion_tokens ?? 0,
        reasoningTokens: usageRaw.completion_tokens_details?.reasoning_tokens ?? 0,
      },
      latencyMs: Date.now() - t0,
    };

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[llm] ${options.label ?? "call"} ok ${result.latencyMs}ms ` +
          `thinking=${thinking} in=${result.usage.promptTokens} ` +
          `out=${result.usage.completionTokens} reason=${result.usage.reasoningTokens}`,
      );
    }
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[llm] ${options.label ?? "call"} 失败，走 fallback:`, (error as Error)?.message);
    }
    return null;
  }
}

/**
 * 调 LLM 并直接拿结构化对象。解析失败返回 null。
 * 这样 5 个路由的"生成 → 校验 → 降级"三步是同一个模式，不会各写各的。
 */
export async function callLLMJson<T>(
  options: LlmCallOptions & { parse: (raw: unknown) => T },
): Promise<T | null> {
  const result = await callLLM({ ...options, json: true });
  if (!result) return null;
  try {
    return options.parse(JSON.parse(result.content));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[llm] ${options.label ?? "call"} JSON 解析/校验失败:`, (error as Error)?.message);
    }
    return null;
  }
}
