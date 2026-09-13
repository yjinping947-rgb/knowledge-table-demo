// 新会话 API 回归：席位隔离、碰撞链路和第三视角。

import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";

async function post(path, body) {
  return fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const followupPayload = {
  topicId: "T01",
  question: "如果孩子生病了，我还应该马上离开吗？",
};

for (const seatId of ["action", "realist"]) {
  const response = await post("/api/followup", { ...followupPayload, seatId });
  assert.equal(response.status, 200, `${seatId} followup status`);
  const result = await response.json();
  assert.equal(result.seatId, seatId, `${seatId} response seatId`);
  assert(result.reply && result.reply.length > 20, `${seatId} reply should be generated or contextual fallback`);
  assert(Array.isArray(result.sourceSeats), `${seatId} sourceSeats missing`);
  assert(result.sourceSeats.every((sourceSeat) => sourceSeat === seatId), `${seatId} source crossed seat boundary`);
}

const collision = await post("/api/collision", {
  topicId: "T01",
  tendency: "both_valid",
  selectedSeatId: "action",
  collisionPoint: "长期消耗可能产生更大的恢复成本",
});
assert.equal(collision.status, 200, "collision status");
const collisionResult = await collision.json();
assert.equal(collisionResult.challenge.seatId, "realist", "collision challenger should be opposing seat");
assert.equal(collisionResult.response.seatId, "action", "collision response should return to original seat");
assert(collisionResult.challenge.sourceSeats.every((seat) => seat === "realist"), "challenge source crossed seat boundary");
assert(collisionResult.response.sourceSeats.every((seat) => seat === "action"), "response source crossed seat boundary");

const divergence = await post("/api/divergence", {
  topicId: "T01",
  tendency: "both_valid",
  selectedSeatId: "action",
  collisionPoint: "长期消耗可能产生更大的恢复成本",
  challenge: collisionResult.challenge.reply,
  response: collisionResult.response.reply,
});
assert.equal(divergence.status, 200, "divergence status");
const divergenceResult = await divergence.json();
assert(divergenceResult.candidates.length >= 2, "divergence candidates missing");

const perspective = await post("/api/perspective", {
  topicId: "T01",
  selectedSeatId: "action",
  collisionPoint: "长期消耗可能产生更大的恢复成本",
  confirmedDivergence: divergenceResult.candidates[0].title,
  excludedNames: [],
});
assert.equal(perspective.status, 200, "perspective status");
const perspectiveResult = await perspective.json();
assert(perspectiveResult.name && perspectiveResult.reframe && perspectiveResult.reply, "perspective fields missing");
assert(perspectiveResult.sourceSeats.every((seat) => seat === "conditional"), "perspective source crossed seat boundary");

console.log("PASS: followup seat isolation, collision roles, divergence and perspective flow");
