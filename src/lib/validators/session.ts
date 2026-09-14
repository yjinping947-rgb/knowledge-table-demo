import { z } from "zod";

const topicId = z.union([z.string().regex(/^T\d{2}$/), z.literal("CUSTOM")]).default("T01");
const customQuestion = z.string().trim().min(4).max(120).optional();
const seatId = z.enum(["action", "realist"]);
const tendency = z.enum(["closer_first", "closer_second", "both_valid", "undecided", "missed_point"]);

const requireCustomQuestion = <T extends z.ZodTypeAny>(schema: T) => schema.superRefine((value, ctx) => {
  const input = value as { topicId?: string; customQuestion?: string };
  if (input.topicId === "CUSTOM" && !input.customQuestion) {
    ctx.addIssue({ code: "custom", message: "自定义话题需要 customQuestion" });
  }
});

export const followupRequestSchema = requireCustomQuestion(z.object({
  topicId,
  customQuestion,
  seatId,
  question: z.string().trim().min(2).max(300),
  context: z.string().trim().max(2500).optional().default(""),
}));

export const collisionRequestSchema = requireCustomQuestion(z.object({
  topicId,
  customQuestion,
  tendency,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  userContext: z.string().trim().max(500).optional().default(""),
  firstSeatReply: z.string().trim().max(800).optional().default(""),
  secondSeatReply: z.string().trim().max(800).optional().default(""),
}));

export const divergenceRequestSchema = requireCustomQuestion(z.object({
  topicId,
  customQuestion,
  tendency,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  challenge: z.string().trim().min(2).max(800),
  response: z.string().trim().min(2).max(800),
  userContext: z.string().trim().max(500).optional().default(""),
}));

export const perspectiveRequestSchema = requireCustomQuestion(z.object({
  topicId,
  customQuestion,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  confirmedDivergence: z.string().trim().min(2).max(800),
  excludedNames: z.array(z.string().trim().min(1).max(80)).max(5).optional().default([]),
  userContext: z.string().trim().max(1200).optional().default(""),
}));
