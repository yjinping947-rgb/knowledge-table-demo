// src/agents/action/index.ts
// 行动派 agent。详见 .harness/agents/action.md

import { seats } from "@/data";
import { actionTone } from "@/lib/prompts/seats";

const seat = seats.find((s) => s.id === "action");
if (!seat) throw new Error("action seat not found in data/seats.json");

export const actionAgent = {
  ...seat,
  tone: actionTone,
};

export type ActionAgent = typeof actionAgent;
