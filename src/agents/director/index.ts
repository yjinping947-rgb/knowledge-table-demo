// src/agents/director/index.ts
// 讨论导演：编排 AI 调用、组装 prompt、决定路由、维持兜底。
// 详见 .harness/agents/director.md

import { seats } from "@/data";
import { getAIClient, getAIModel } from "@/lib/ai";
import {
  directorSystemPrompt,
  discussPrompt,
  summarySystemPrompt,
  summaryPrompt,
} from "@/lib/prompts";
import { actionTone, conditionalTone, realistTone } from "@/lib/prompts/seats";
import { getDiscussFallback, getSummaryFallback } from "@/lib/fallback";
import { discussOutputSchema, parseModelJson, summaryOutputSchema } from "@/lib/validators";
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
  const client = getAIClient();
  if (!client) return fallback;

  try {
    const systemPrompt = [
      directorSystemPrompt,
      actionTone,
      realistTone,
      conditionalTone,
    ].join("\n\n");
    const completion = await client.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: discussPrompt(input) },
      ],
    });
    const parsed = discussOutputSchema.parse(parseModelJson(completion.choices[0]?.message?.content || ""));
    const seat = seats.find((item) => item.id === parsed.selectedSeatId);
    if (!seat || parsed.sourceIds.some((id) => !seat.sourceIds.includes(id))) {
      throw new Error("模型返回了不允许的来源");
    }
    return { ...parsed, mode: "ai" satisfies Mode };
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("AI discuss fallback:", error);
    return fallback;
  }
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
  const client = getAIClient();
  if (!client) return fallback;

  try {
    const completion = await client.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: "system", content: summarySystemPrompt },
        { role: "user", content: summaryPrompt(input) },
      ],
    });
    const parsed = summaryOutputSchema.parse(parseModelJson(completion.choices[0]?.message?.content || ""));
    return { ...parsed, mode: "ai" satisfies Mode };
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("AI summary fallback:", error);
    return fallback;
  }
}
