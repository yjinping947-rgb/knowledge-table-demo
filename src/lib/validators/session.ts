// src/lib/validators/session.ts
// 会话类接口的请求 schema。
//
// 兼容策略：所有新增字段都是 optional + 有默认值。
// 前端现在不传 → 服务端照样能跑（上下文少一点）；
// 前端将来补传 → 自动获得更完整的上下文，无需改后端。

import { z } from "zod";

const topicId = z.string().regex(/^T\d{2}$/).default("T01");
const seatId = z.enum(["action", "realist"]);
const tendency = z.enum(["closer_first", "closer_second", "both_valid", "undecided", "missed_point"]);

/** 会话标识与用户补充条件 —— 5 条路由共用 */
const sessionFields = {
  sessionId: z.string().trim().max(120).optional(),
  /** sessionId 的 HMAC 签名，防止枚举/伪造他人会话（对抗性测试 D1 修复） */
  sessionSignature: z.string().trim().max(64).optional(),
  userAddedConditions: z.array(z.string().trim().max(200)).max(10).optional().default([]),
};

export const followupRequestSchema = z.object({
  topicId,
  seatId,
  question: z.string().trim().min(2).max(300),
  ...sessionFields,
});

export const collisionRequestSchema = z.object({
  topicId,
  tendency,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  userContext: z.string().trim().max(500).optional().default(""),
  /** PRD 6.8 要求质疑"指向原席已表达过的具体内容"，所以要把两席原话传进来 */
  firstSeatStatement: z.string().trim().max(1000).optional(),
  secondSeatStatement: z.string().trim().max(1000).optional(),
  ...sessionFields,
});

export const divergenceRequestSchema = z.object({
  topicId,
  tendency,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  challenge: z.string().trim().min(2).max(800),
  response: z.string().trim().min(2).max(800),
  userContext: z.string().trim().max(500).optional().default(""),
  ...sessionFields,
});

export const perspectiveRequestSchema = z.object({
  topicId,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  confirmedDivergence: z.string().trim().min(2).max(800),
  excludedNames: z.array(z.string().trim().min(1).max(80)).max(5).optional().default([]),
  challenge: z.string().trim().max(800).optional(),
  response: z.string().trim().max(800).optional(),
  ...sessionFields,
});
