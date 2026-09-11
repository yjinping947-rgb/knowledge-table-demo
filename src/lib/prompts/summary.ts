// src/lib/prompts/summary.ts
// 总结的 prompt 模板。

import { seats } from "@/data";
import type { FirstChoice, PositionChange, SecondChoice } from "@/lib/types";

export const summarySystemPrompt = `根据用户两轮选择和已出现观点，生成个人化讨论地图。明确共识、真正分歧、用户可能默认但未表达的前提、立场变化、尚待思考的问题。不要把推断写成事实，不评价对错。只返回 JSON，不要代码围栏或解释。`;

export type SummaryInput = {
  firstChoice: FirstChoice;
  secondChoice: SecondChoice;
  positionChange: PositionChange;
  respondedSeatIds: string[];
};

export function summaryPrompt(input: SummaryInput): string {
  return `固定问题：年轻人该不该裸辞？\n席位：${JSON.stringify(seats)}\n用户路径：${JSON.stringify(input)}\n返回结构：{"consensus":"...","disagreement":"...","hiddenAssumption":"...","trajectory":{"before":"...","during":"...","after":"..."},"openQuestion":"..."}`;
}
