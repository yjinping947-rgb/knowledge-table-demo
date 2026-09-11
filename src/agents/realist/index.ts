// src/agents/realist/index.ts
// 现实派 agent。详见 .harness/agents/realist.md

import { seats } from "@/data";
import { realistTone } from "@/lib/prompts/seats";

const seat = seats.find((s) => s.id === "realist");
if (!seat) throw new Error("realist seat not found in data/seats.json");

export const realistAgent = {
  ...seat,
  tone: realistTone,
};

export type RealistAgent = typeof realistAgent;
