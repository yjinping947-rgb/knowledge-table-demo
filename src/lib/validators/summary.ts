// src/lib/validators/summary.ts
// /api/summary 的请求与响应 schema。详见 .harness/contracts/summary.md。

import { z } from "zod";

export const summaryRequestSchema = z.object({
  topicId: z.string().regex(/^T\d{2}$/).default("T01"),
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
  // 会话字段（前端可选传，不传则服务端派新房间）
  sessionId: z.string().trim().max(120).optional(),
  sessionSignature: z.string().trim().max(64).optional(),
  userAddedConditions: z.array(z.string().trim().max(200)).max(10).optional().default([]),
});

export const summaryOutputSchema = z.object({
  consensus: z.string().min(1),
  disagreement: z.string().min(1),
  hiddenAssumption: z.string().min(1),
  trajectory: z.object({ before: z.string().min(1), during: z.string().min(1), after: z.string().min(1) }),
  openQuestion: z.string().min(1),
});
