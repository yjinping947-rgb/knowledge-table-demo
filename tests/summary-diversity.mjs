// 验证总结页的四个观点字段不会因为同一来源重复而全部显示同一段话。
import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://127.0.0.1:3004";
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), Number(process.env.TEST_TIMEOUT_MS || 30_000));
const response = await fetch(`${base}/api/summary`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    flow: "knowledge-table-v2",
    topicId: "T01",
    firstChoice: "support_quit",
    secondChoice: "set_deadline",
    positionChange: "slightly_changed",
    respondedSeatIds: ["action", "realist"],
    tendency: "both_valid",
    collisionPoint: "收入中断会造成压力",
    challenge: "我担心没有医保",
    response: "可以设置期限并准备缓冲",
    confirmedDivergence: "先保护健康还是先保护现金流",
    followupTurns: [{ seatId: "realist", question: "我没钱但身体撑不住怎么办", reply: "先盘点现金和保障" }],
    likedQuotes: ["先保护健康，再安排现金流"],
  }),
  signal: controller.signal,
}).finally(() => clearTimeout(timeout));

assert.equal(response.status, 200, `summary status=${response.status}`);
const summary = await response.json();
const fields = [summary.consensus, summary.disagreement, summary.hiddenAssumption, summary.openQuestion]
  .map((value) => String(value || "").replace(/\s+/g, " ").trim());
assert(fields.every(Boolean), "summary 四个观点字段都必须有内容");
assert(new Set(fields).size >= 3, "summary 四个观点字段不应全部重复");
assert(Array.isArray(summary.sourceIds), "summary 缺少 sourceIds");
assert.equal(new Set(summary.sourceIds).size, summary.sourceIds.length, "summary 来源不应重复");

console.log(JSON.stringify({
  base,
  mode: summary.mode,
  sourceStatus: summary.sourceStatus,
  uniqueFields: new Set(fields).size,
  sourceCount: summary.sourceIds.length,
  result: "PASS_SUMMARY_DIVERSITY",
}, null, 2));
