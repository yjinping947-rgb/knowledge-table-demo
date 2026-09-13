import { z } from "zod";

const topicId = z.string().regex(/^T\d{2}$/).default("T01");
const seatId = z.enum(["action", "realist"]);
const tendency = z.enum(["closer_first", "closer_second", "both_valid", "undecided", "missed_point"]);

export const followupRequestSchema = z.object({
  topicId,
  seatId,
  question: z.string().trim().min(2).max(300),
});

export const collisionRequestSchema = z.object({
  topicId,
  tendency,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  userContext: z.string().trim().max(500).optional().default(""),
});

export const divergenceRequestSchema = z.object({
  topicId,
  tendency,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  challenge: z.string().trim().min(2).max(800),
  response: z.string().trim().min(2).max(800),
  userContext: z.string().trim().max(500).optional().default(""),
});

export const perspectiveRequestSchema = z.object({
  topicId,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  confirmedDivergence: z.string().trim().min(2).max(800),
  excludedNames: z.array(z.string().trim().min(1).max(80)).max(5).optional().default([]),
});
