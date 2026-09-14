// src/lib/validators/discuss.ts
// /api/discuss 的请求与响应 schema。详见 .harness/contracts/discuss.md。

import { z } from "zod";

export const discussRequestSchema = z
  .object({
    topicId: z.union([z.string().regex(/^T\d{2}$/), z.literal("CUSTOM")]).default("T01"),
    customQuestion: z.string().trim().min(4).max(120).optional(),
    round: z.union([z.literal(1), z.literal(2)]),
    firstChoice: z.enum(["support_quit", "oppose_quit", "depends"]),
    secondChoice: z.enum(["leave_now", "wait_offer", "set_deadline"]).nullable().optional(),
    respondedSeatIds: z.array(z.enum(["action", "realist", "conditional"])).max(3),
    previousReply: z.string().trim().max(800).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.topicId === "CUSTOM" && !value.customQuestion) {
      ctx.addIssue({ code: "custom", message: "自定义话题需要 customQuestion" });
    }
    if (value.round === 2 && !value.secondChoice) {
      ctx.addIssue({ code: "custom", message: "第二轮需要 secondChoice" });
    }
  });

export const discussOutputSchema = z.object({
  selectedSeatId: z.enum(["action", "realist", "conditional"]),
  reply: z.string().min(1).max(140),
  hostComment: z.string().min(1).max(100),
  sourceIds: z.array(z.string()).min(1).max(3),
  sourceUrls: z.array(z.string()).optional(),
  authors: z.array(z.string()).optional(),
  sourceStatus: z.enum(["zhihu-realtime", "hybrid", "local-fallback", "no-result"]),
  mode: z.enum(["ai", "fallback"]),
});
