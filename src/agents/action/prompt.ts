// src/agents/action/prompt.ts
// 行动派 prompt 组装。当前 director 把所有 seat tone 拼到 system prompt；
// 如需每个 agent 独立 prompt 组装，在此扩展。
// 详见 .harness/skills/write-seat-reply.md

export { actionTone } from "@/lib/prompts/seats/action";
