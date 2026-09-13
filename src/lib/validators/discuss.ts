// src/lib/validators/discuss.ts
// /api/discuss 的请求与响应 schema。详见 .harness/contracts/discuss.md。

import { z } from "zod";

export const discussRequestSchema = z
  .object({
    topicId: z.string().regex(/^T\d{2}$/).default("T01"),
    round: z.union([z.literal(1), z.literal(2)]),
    firstChoice: z.enum(["support_quit", "oppose_quit", "depends"]),
    secondChoice: z.enum(["leave_now", "wait_offer", "set_deadline"]).nullable().optional(),
    respondedSeatIds: z.array(z.enum(["action", "realist", "conditional"])).max(3),
  })
  .superRefine((value, ctx) => {
    if (value.round === 2 && !value.secondChoice) {
      ctx.addIssue({ code: "custom", message: "第二轮需要 secondChoice" });
    }
  });

export const discussOutputSchema = z.object({
  selectedSeatId: z.enum(["action", "realist", "conditional"]),
  reply: z.string().min(1).max(140),
  hostComment: z.string().min(1).max(100),
  sourceIds: z.array(z.string()).min(1).max(3),
});
