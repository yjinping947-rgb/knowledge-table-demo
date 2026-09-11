// src/agents/conditional/index.ts
// 条件派 agent。详见 .harness/agents/conditional.md

import { seats } from "@/data";
import { conditionalTone } from "@/lib/prompts/seats";

const seat = seats.find((s) => s.id === "conditional");
if (!seat) throw new Error("conditional seat not found in data/seats.json");

export const conditionalAgent = {
  ...seat,
  tone: conditionalTone,
};

export type ConditionalAgent = typeof conditionalAgent;
