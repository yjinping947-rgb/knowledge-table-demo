// src/lib/validators/session.ts
// 会话类接口的请求 schema。
//
// 合并说明（取长补短）：
// - 采用队长版的富 schema：context.previousFollowups、firstSeatStatement /
//   secondSeatStatement、以及 superRefine 的"新客户端必须带完整上下文"校验。
// - 保留本分支的 sessionSignature：sessionId 的 HMAC 签名，
//   防止枚举 / 伪造他人会话（对抗性测试 D1 修复）。
//
// 兼容策略：所有新增字段都是 optional + 有默认值。
// 前端现在不传 → 服务端照样能跑（上下文少一点）；
// 前端将来补传 → 自动获得更完整的上下文，无需改后端。

import { z } from "zod";

const topicId = z.string().regex(/^T\d{2}$/).default("T01");
const seatId = z.enum(["action", "realist"]);
const tendency = z.enum(["closer_first", "closer_second", "both_valid", "undecided", "missed_point"]).optional().default("undecided");
const requestMeta = {
  sessionId: z.string().trim().min(1).max(100).optional(),
  requestId: z.string().trim().min(1).max(100).optional(),
};
const userConditions = z.array(z.string().trim().min(1).max(300)).max(12).optional().default([]);
const statement = z.string().trim().max(1600).optional().default("");

/** 本分支新增：sessionId 的 HMAC 签名（对抗性测试 D1 修复） */
const sessionSignature = {
  sessionSignature: z.string().trim().max(64).optional(),
};

export const followupRequestSchema = z.object({
  ...requestMeta,
  topicId,
  seatId,
  question: z.string().trim().min(2).max(300),
  context: z.object({
    previousFollowups: z.array(z.unknown()).max(20).optional().default([]),
    userAddedConditions: userConditions,
  }).optional().default({ previousFollowups: [], userAddedConditions: [] }),
  userAddedConditions: userConditions,
  ...sessionSignature,
});

export const collisionRequestSchema = z.object({
  ...requestMeta,
  topicId,
  tendency,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  userContext: z.string().trim().max(500).optional().default(""),
  userAddedConditions: userConditions,
  /** PRD 6.8 要求质疑"指向原席已表达过的具体内容"，所以要把两席原话传进来 */
  firstSeatStatement: statement,
  secondSeatStatement: statement,
  ...sessionSignature,
}).superRefine((value, ctx) => {
  // 新客户端带 session/request 元数据时，服务端也校验碰撞确实发生在两席
  // 的完整陈述之间；旧版演示请求没有这些字段，保留兼容路径。
  if ((value.sessionId || value.requestId) && value.firstSeatStatement.length < 2) {
    ctx.addIssue({ code: "custom", path: ["firstSeatStatement"], message: "缺少第一席陈述" });
  }
  if ((value.sessionId || value.requestId) && value.secondSeatStatement.length < 2) {
    ctx.addIssue({ code: "custom", path: ["secondSeatStatement"], message: "缺少第二席陈述" });
  }
});

export const divergenceRequestSchema = z.object({
  ...requestMeta,
  topicId,
  tendency,
  selectedSeatId: seatId,
  collisionPoint: z.string().trim().min(2).max(300),
  challenge: z.string().trim().min(2).max(800),
  response: z.string().trim().min(2).max(800),
  userContext: z.string().trim().max(500).optional().default(""),
  userAddedConditions: userConditions,
  ...sessionSignature,
});

export const perspectiveRequestSchema = z.object({
  ...requestMeta,
  topicId,
  selectedSeatId: seatId,
  divergenceId: z.string().trim().min(1).max(100).optional(),
  collisionPoint: z.string().trim().min(2).max(300),
  confirmedDivergence: z.string().trim().min(2).max(800),
  firstSeatStatement: statement,
  secondSeatStatement: statement,
  challenge: z.string().trim().max(1000).optional().default(""),
  response: z.string().trim().max(1000).optional().default(""),
  userAddedConditions: userConditions,
  excludedNames: z.array(z.string().trim().min(1).max(80)).max(5).optional().default([]),
  ...sessionSignature,
}).superRefine((value, ctx) => {
  if (!(value.sessionId || value.requestId)) return;
  if (!value.divergenceId) {
    ctx.addIssue({ code: "custom", path: ["divergenceId"], message: "缺少已确认的分歧 id" });
  }
  const required: Array<[keyof typeof value, string]> = [
    ["firstSeatStatement", "缺少第一席陈述"],
    ["secondSeatStatement", "缺少第二席陈述"],
    ["challenge", "缺少碰撞质疑"],
    ["response", "缺少碰撞回应"],
  ];
  for (const [field, message] of required) {
    const current = value[field];
    if (typeof current !== "string" || current.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: [field], message });
    }
  }
});
