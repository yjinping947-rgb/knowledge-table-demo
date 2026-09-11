// src/lib/prompts/discuss.ts
// 两轮讨论的 prompt 模板。

import { seats, sources } from "@/data";
import type { FirstChoice, SecondChoice } from "@/lib/types";

export type DiscussInput = {
  round: 1 | 2;
  firstChoice: FirstChoice;
  secondChoice: SecondChoice | null;
  respondedSeatIds: string[];
};

export function discussPrompt(input: DiscussInput): string {
  return `固定问题：年轻人该不该裸辞？\n席位：${JSON.stringify(seats)}\n允许来源：${JSON.stringify(sources)}\n用户状态：${JSON.stringify(input)}\n返回结构：{"selectedSeatId":"action|realist|conditional","reply":"...","hostComment":"...","sourceIds":["该席位绑定的编号"]}`;
}
