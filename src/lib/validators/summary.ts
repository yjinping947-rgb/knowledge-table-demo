// src/lib/validators/summary.ts
// /api/summary 的请求与响应 schema。详见 .harness/contracts/summary.md。

import { z } from "zod";

export const summaryRequestSchema = z.object({
  topicId: z.union([z.string().regex(/^T\d{2}$/), z.literal("CUSTOM")]).default("T01"),
  customQuestion: z.string().trim().min(4).max(120).optional(),
  firstChoice: z.enum(["support_quit", "oppose_quit", "depends"]),
  secondChoice: z.enum(["leave_now", "wait_offer", "set_deadline"]),
  positionChange: z.enum(["unchanged", "slightly_changed", "changed"]),
  respondedSeatIds: z.array(z.enum(["action", "realist", "conditional"])).max(3),
  flow: z.literal("knowledge-table-v2").optional(),
  tendency: z.enum(["closer_first", "closer_second", "both_valid", "undecided", "missed_point"]).optional(),
  collisionPoint: z.string().trim().min(2).max(300).optional(),
  challenge: z.string().trim().min(2).max(800).optional(),
  response: z.string().trim().min(2).max(800).optional(),
  confirmedDivergence: z.string().trim().min(2).max(800).optional(),
  perspectiveName: z.string().trim().max(100).optional(),
  perspectiveReframe: z.string().trim().max(800).optional(),
  // 用户在单席暂停期间的连续追问，供结束总结还原完整语境。
  followupTurns: z.array(z.object({
    seatId: z.enum(["action", "realist"]),
    question: z.string().trim().min(2).max(300),
    reply: z.string().trim().min(1).max(1200),
  })).max(12).optional().default([]),
  likedQuotes: z.array(z.string().trim().min(2).max(600)).max(20).optional().default([]),
}).superRefine((value, ctx) => {
  if (value.topicId === "CUSTOM" && !value.customQuestion) {
    ctx.addIssue({ code: "custom", message: "自定义话题需要 customQuestion" });
  }
});

export const summaryOutputSchema = z.object({
  consensus: z.string().min(1),
  disagreement: z.string().min(1),
  hiddenAssumption: z.string().min(1),
  trajectory: z.object({ before: z.string().min(1), during: z.string().min(1), after: z.string().min(1) }),
  openQuestion: z.string().min(1),
  goldenQuote: z.string().min(1).optional(),
});
