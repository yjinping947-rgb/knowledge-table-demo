// src/lib/validators/summary.ts
// /api/summary 的请求与响应 schema。详见 .harness/contracts/summary.md。

import { z } from "zod";

export const summaryRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(100).optional(),
  requestId: z.string().trim().min(1).max(100).optional(),
  topicId: z.string().regex(/^T\d{2}$/).default("T01"),
  // V2 提前整理可以只提交已发生的会话；旧 /api/summary 契约仍由
  // superRefine 保持 firstChoice + secondChoice 的必填行为。
  firstChoice: z.enum(["support_quit", "oppose_quit", "depends"]).optional(),
  secondChoice: z.enum(["leave_now", "wait_offer", "set_deadline"]).optional(),
  positionChange: z.enum(["unchanged", "slightly_changed", "changed"]).optional(),
  respondedSeatIds: z.array(z.enum(["action", "realist", "conditional"])).max(3).optional().default([]),
  flow: z.literal("knowledge-table-v2").optional(),
  tendency: z.enum(["closer_first", "closer_second", "both_valid", "undecided", "missed_point"]).optional(),
  collisionPoint: z.string().trim().min(2).max(300).optional(),
  challenge: z.string().trim().min(2).max(800).optional(),
  response: z.string().trim().min(2).max(800).optional(),
  confirmedDivergence: z.string().trim().min(2).max(800).optional(),
  perspectiveName: z.string().trim().max(100).optional(),
  perspectiveReframe: z.string().trim().max(800).optional(),
  firstSeatStatement: z.string().trim().max(1600).optional(),
  secondSeatStatement: z.string().trim().max(1600).optional(),
  followups: z.array(z.unknown()).max(20).optional().default([]),
  collision: z.unknown().optional(),
  thirdSeatStatement: z.string().trim().max(1600).optional(),
  exitUnderstanding: z.string().trim().max(800).optional(),
  thirdSeatInvited: z.boolean().optional().default(false),
  userAddedConditions: z.array(z.string().trim().min(1).max(300)).max(12).optional().default([]),
}).superRefine((value, ctx) => {
  if (value.flow === "knowledge-table-v2") return;
  if (!value.firstChoice) ctx.addIssue({ code: "custom", path: ["firstChoice"], message: "缺少 firstChoice" });
  if (!value.secondChoice) ctx.addIssue({ code: "custom", path: ["secondChoice"], message: "缺少 secondChoice" });
  if (!value.positionChange) ctx.addIssue({ code: "custom", path: ["positionChange"], message: "缺少 positionChange" });
});

/** 模型只负责这两个新产物；legacy summary 字段仍由 fallback / 旧契约提供。 */
export const discussionMapSchema = z.object({
  question: z.string().min(1).max(80),
  ripples: z.array(z.object({
    // 结果卡外围节点应短而可读，避免模型输出整句段落。
    label: z.string().trim().min(4).max(6),
    type: z.enum(["conflict", "premise", "perspective"]),
    sourceSeat: z.enum(["action", "realist", "conditional"]).optional(),
  })).max(3),
  trajectory: z.object({
    start: z.enum(["action", "realist", "conditional", "undecided"]),
    checkpoints: z.array(z.enum(["collision", "action", "realist", "conditional"])),
    end: z.enum(["action", "realist", "conditional", "undecided"]),
  }),
});

export const summaryOutputSchema = z.object({
  consensus: z.string().min(1),
  disagreement: z.string().min(1),
  hiddenAssumption: z.string().min(1),
  trajectory: z.object({ before: z.string().min(1), during: z.string().min(1), after: z.string().min(1) }),
  openQuestion: z.string().min(1),
  discussionMap: discussionMapSchema.optional(),
  soulSentence: z.string().max(40).optional(),
});
