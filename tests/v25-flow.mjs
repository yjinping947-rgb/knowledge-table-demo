// 知识拼桌 V2.5 核心链路与第三席边界回归。

import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";

async function post(path, body) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  assert.equal(response.status, 200, `${path}: ${response.status} ${JSON.stringify(json)}`);
  return json;
}

const session = { sessionId: "sess_v25_regression", topicId: "T01" };
const firstSeatStatement = "工作持续伤害身心，离开可以是止损，但要保护最低生活线。";
const secondSeatStatement = "现金流和替代方案不足时，先设置期限和安全线。";
const collisionPoint = "继续留下本身是不是一种风险？";

const followup = await post("/api/followup", {
  ...session,
  requestId: "req_v25_followup",
  seatId: "action",
  question: "如果孩子生病了呢？",
  context: { previousFollowups: [], userAddedConditions: [] },
});
assert.equal(followup.requestId, "req_v25_followup");
assert.equal(followup.seatId, "action");
assert(followup.sourceSeatIds.every((seatId) => seatId === "action"));
assert.match(followup.reply, /孩子|照护|家人/);

const collision = await post("/api/collision", {
  ...session,
  requestId: "req_v25_collision",
  tendency: "closer_first",
  selectedSeatId: "action",
  collisionPoint,
  firstSeatStatement,
  secondSeatStatement,
  userAddedConditions: [],
});
assert.equal(collision.requestId, "req_v25_collision");
assert.equal(collision.challenge.seatId, "realist");
assert.equal(collision.response.seatId, "action");
assert(collision.challenge.sourceSeatIds.every((seatId) => seatId === "realist"));
assert(collision.response.sourceSeatIds.every((seatId) => seatId === "action"));

const divergence = await post("/api/divergence", {
  ...session,
  requestId: "req_v25_divergence",
  tendency: "closer_first",
  selectedSeatId: "action",
  collisionPoint,
  challenge: collision.challenge.reply,
  response: collision.response.reply,
  userAddedConditions: [],
});
assert.equal(divergence.candidates.length, 3);
assert(divergence.candidates.every((candidate) => candidate.conversationQuoteIds.length > 0));

const selectedDivergence = divergence.candidates[0];
const perspective = await post("/api/perspective", {
  ...session,
  requestId: "req_v25_perspective",
  selectedSeatId: "action",
  divergenceId: selectedDivergence.id,
  confirmedDivergence: selectedDivergence.title,
  collisionPoint,
  firstSeatStatement,
  secondSeatStatement,
  challenge: collision.challenge.reply,
  response: collision.response.reply,
  userAddedConditions: [],
  excludedNames: [],
});
assert.equal(perspective.origin, "ai_synthesis");
assert.equal(perspective.generatedFrom.divergenceId, selectedDivergence.id);

const summaryInput = {
  ...session,
  flow: "knowledge-table-v2",
  firstSeatStatement,
  secondSeatStatement,
  tendency: "closer_first",
  collisionPoint,
  challenge: collision.challenge.reply,
  response: collision.response.reply,
  confirmedDivergence: selectedDivergence.title,
  firstChoice: "support_quit",
  secondChoice: "set_deadline",
  positionChange: "slightly_changed",
  respondedSeatIds: ["action"],
  exitUnderstanding: "PRIVATE_MARKER_7429 不应进入分享结果",
};

const withoutThird = await post("/api/summary", {
  ...summaryInput,
  requestId: "req_v25_summary_without_third",
  thirdSeatInvited: false,
});
assert(!withoutThird.sources.some((source) => source.seatId === "conditional"));
assert.notEqual(withoutThird.discussionMap.trajectory.end, "conditional");
assert(!withoutThird.discussionMap.trajectory.checkpoints.includes("conditional"));
assert(!withoutThird.discussionMap.ripples.some((ripple) => ripple.sourceSeat === "conditional"));
assert(!JSON.stringify(withoutThird).includes("PRIVATE_MARKER_7429"));

const withThird = await post("/api/summary", {
  ...summaryInput,
  requestId: "req_v25_summary_with_third",
  thirdSeatInvited: true,
  perspectiveName: perspective.name,
  perspectiveReframe: perspective.reframe,
  thirdSeatStatement: perspective.reply,
});
assert(withThird.sources.some((source) => source.seatId === "conditional"));
assert.equal(withThird.discussionMap.trajectory.end, "conditional");
assert(withThird.discussionMap.trajectory.checkpoints.includes("conditional"));

// 第三席边界：仅伪造名称或布尔值，不足以把条件视角写进结果。
const forgedThird = await post("/api/summary", {
  ...summaryInput,
  requestId: "req_v25_summary_forged_third",
  thirdSeatInvited: true,
  perspectiveName: "   ",
  thirdSeatStatement: "不应被当成已入桌的发言",
});
assert(!forgedThird.sources.some((source) => source.seatId === "conditional"));
assert.notEqual(forgedThird.discussionMap.trajectory.end, "conditional");
assert(!forgedThird.discussionMap.trajectory.checkpoints.includes("conditional"));

const nameOnlyThird = await post("/api/summary", {
  ...summaryInput,
  requestId: "req_v25_summary_name_only_third",
  perspectiveName: perspective.name,
  thirdSeatInvited: false,
});
assert(!nameOnlyThird.sources.some((source) => source.seatId === "conditional"));
assert.notEqual(nameOnlyThird.discussionMap.trajectory.end, "conditional");

// 追问响应必须回显当前请求的 session/request/topic 元数据。
const metadataEcho = await post("/api/followup", {
  sessionId: "sess_v25_metadata",
  requestId: "req_v25_metadata",
  topicId: "T02",
  seatId: "action",
  question: "如果家人需要照护呢？",
  context: { previousFollowups: [], userAddedConditions: [] },
});
assert.equal(metadataEcho.sessionId, "sess_v25_metadata");
assert.equal(metadataEcho.requestId, "req_v25_metadata");
assert.equal(metadataEcho.topicId, "T02");
assert.equal(metadataEcho.seatId, "action");

console.log("PASS: V2.5 followup → collision → divergence → optional third-seat → summary boundaries");
