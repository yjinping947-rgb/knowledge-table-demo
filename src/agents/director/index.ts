// src/agents/director/index.ts
// 讨论导演：编排 AI 调用、组装 prompt、决定路由、维持兜底。
// 详见 .harness/agents/director.md

import { seats } from "@/data";
import { callLLMJson } from "@/lib/ai";
import {
  directorSystemPrompt,
  discussPrompt,
  summarySystemPrompt,
  summaryPrompt,
} from "@/lib/prompts";
import { actionTone, conditionalTone, realistTone } from "@/lib/prompts/seats";
import { getDiscussFallback, getSummaryFallback } from "@/lib/fallback";
import { discussOutputSchema, summaryOutputSchema } from "@/lib/validators";
import type { DiscussResult, FirstChoice, Mode, PositionChange, SecondChoice, SummaryResult } from "@/lib/types";

/**
 * 两轮讨论：调 AI，失败时走 fallback。
 * 详见 .harness/contracts/discuss.md
 */
export async function runDiscuss(input: {
  round: 1 | 2;
  firstChoice: FirstChoice;
  secondChoice: SecondChoice | null;
  respondedSeatIds: string[];
}): Promise<DiscussResult> {
  const fallback = getDiscussFallback(input.round, input.firstChoice, input.secondChoice);
  const systemPrompt = [
    directorSystemPrompt,
    actionTone,
    realistTone,
    conditionalTone,
  ].join("\n\n");

  // 统一走 callLLMJson（thinking=disabled）。原先直接调 client.chat.completions.create
  // 且不传 thinking，会跑在 DeepSeek 默认思考模式下，白白烧掉思维链预算。
  const parsed = await callLLMJson({
    system: systemPrompt,
    user: discussPrompt(input),
    parse: (raw) => discussOutputSchema.parse(raw),
    temperature: 0.7,
    thinking: "disabled",
    maxTokens: 900,
    label: "director:discuss",
  });
  if (!parsed) return fallback;

  const seat = seats.find((item) => item.id === parsed.selectedSeatId);
  if (!seat || parsed.sourceIds.some((id) => !seat.sourceIds.includes(id))) {
    if (process.env.NODE_ENV === "development") console.warn("AI discuss: 模型返回了不允许的来源，走 fallback");
    return fallback;
  }
  return { ...parsed, mode: "ai" satisfies Mode };
}

/**
 * 总结：调 AI，失败时走 fallback。
 * 详见 .harness/contracts/summary.md
 */
export async function runSummary(input: {
  firstChoice: FirstChoice;
  secondChoice: SecondChoice;
  positionChange: PositionChange;
  respondedSeatIds: string[];
}): Promise<SummaryResult> {
  const fallback = getSummaryFallback(input.firstChoice, input.secondChoice, input.positionChange);

  // 同上：统一走 callLLMJson，固化 thinking=disabled。
  const parsed = await callLLMJson({
    system: summarySystemPrompt,
    user: summaryPrompt(input),
    parse: (raw) => summaryOutputSchema.parse(raw),
    temperature: 0.7,
    thinking: "disabled",
    maxTokens: 900,
    label: "director:summary",
  });
  if (!parsed) return fallback;
  return { ...parsed, mode: "ai" satisfies Mode };
}
