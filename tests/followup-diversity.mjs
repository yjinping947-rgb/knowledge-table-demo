// 验证同一席位面对两个不同追问时，服务能针对当前问题作答。
// 默认允许降级；EXPECT_AI=1 时要求两次均为 LLM 实时生成。
import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://127.0.0.1:3004";
const expectAI = process.env.EXPECT_AI === "1";

async function followup(question) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.TEST_TIMEOUT_MS || 25_000));
  const response = await fetch(`${base}/api/followup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topicId: "T01", seatId: "action", question }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  assert.equal(response.status, 200, `followup status=${response.status}`);
  return response.json();
}

const firstQuestion = "我没钱但已经被工作拖垮了，现在最该先做什么？";
const secondQuestion = "我有一百万元存款，想转行又担心家人反对，应该怎样安排？";
const first = await followup(firstQuestion);
const second = await followup(secondQuestion);

assert(first.reply && second.reply, "两次追问都必须返回 reply");
assert.notEqual(first.reply, second.reply, "同一席位对不同问题返回了完全相同的回复");
assert(first.sourceStatus && second.sourceStatus, "缺少 sourceStatus");

if (expectAI) {
  assert.equal(first.mode, "ai", `第一次不是 LLM 生成：${first.mode}`);
  assert.equal(second.mode, "ai", `第二次不是 LLM 生成：${second.mode}`);
  assert.equal(first.sourceStatus, "zhihu-realtime", `第一次不是实时来源：${first.sourceStatus}`);
  assert.equal(second.sourceStatus, "zhihu-realtime", `第二次不是实时来源：${second.sourceStatus}`);
}

console.log(JSON.stringify({
  base,
  expectAI,
  first: { mode: first.mode, sourceStatus: first.sourceStatus, reply: first.reply },
  second: { mode: second.mode, sourceStatus: second.sourceStatus, reply: second.reply },
  result: first.mode === "ai" && second.mode === "ai" ? "PASS_AI_DIFFERENT" : "PASS_FALLBACK_DIFFERENT",
}, null, 2));
