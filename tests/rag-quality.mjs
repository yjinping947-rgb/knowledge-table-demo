// tests/rag-quality.mjs
// RAG 真实输出质量校验。
// 启动：npm run start & 然后 node tests/rag-quality.mjs
// 详见 .harness/contracts/discuss.md 和 .harness/contracts/summary.md。

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const topics = JSON.parse(await readFile(new URL("../src/data/topics.json", import.meta.url), "utf8"));
const expectedTopicCount = Object.keys(topics).length;

async function post(path, body) {
  return fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ZHUHU_HOST = /zhihu\.com/;
const OPENAPI_TAG = /openapi_platform/;

let pass = 0;
let total = 0;

async function check(name, fn) {
  total++;
  try {
    await fn();
    pass++;
    console.log(`[${pass}/${total}] ✓ ${name}`);
  } catch (e) {
    console.log(`[${pass}/${total}] ✗ ${name}: ${e.message}`);
  }
}

// —— /api/discuss RAG 质量 ——

// 1. firstChoice=support_quit → mode=ai
await check("discuss support_quit → mode=ai", async () => {
  const r = await post("/api/discuss", {
    round: 1,
    firstChoice: "support_quit",
    secondChoice: null,
    respondedSeatIds: [],
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.mode, "ai", `expected mode=ai, got ${j.mode}`);
  assert(["action", "realist", "conditional"].includes(j.selectedSeatId));
});

// 2. sourceUrls 必须是真实知乎 URL（含 openapi_platform 标识）
await check("discuss sourceUrls 真实知乎", async () => {
  const r = await post("/api/discuss", {
    round: 1,
    firstChoice: "oppose_quit",
    secondChoice: null,
    respondedSeatIds: [],
  });
  const j = await r.json();
  assert(j.sourceUrls && j.sourceUrls.length > 0, "sourceUrls 缺失");
  for (const u of j.sourceUrls) {
    assert.match(u, ZHUHU_HOST, `not zhihu.com: ${u}`);
    assert.match(u, OPENAPI_TAG, `not openapi_platform: ${u}`);
  }
});

// 3. reply 是真实中文（>20 字符，不超 320）
await check("discuss reply 长度合理", async () => {
  const r = await post("/api/discuss", {
    round: 1,
    firstChoice: "depends",
    secondChoice: null,
    respondedSeatIds: [],
  });
  const j = await r.json();
  assert(j.reply.length >= 20, `reply 太短: ${j.reply.length}`);
  assert(j.reply.length <= 320, `reply 太长: ${j.reply.length}`);
});

// 4. 第二轮：firstChoice + secondChoice 组合
await check("discuss 第二轮：set_deadline", async () => {
  const r = await post("/api/discuss", {
    round: 2,
    firstChoice: "support_quit",
    secondChoice: "set_deadline",
    respondedSeatIds: ["action"],
  });
  const j = await r.json();
  assert.equal(j.mode, "ai");
  assert(j.sourceUrls && j.sourceUrls.length > 0);
  // 期望 seat=conditional (set_deadline → conditional)
  // 但不强制，AI 自由
});

// 5. 400 错误
await check("discuss 缺 firstChoice → 400", async () => {
  const r = await post("/api/discuss", { round: 1, respondedSeatIds: [] });
  assert.equal(r.status, 400);
});

// —— /api/summary RAG 质量 ——

// 6. summary 4 字段都有
// 注意：summary 的 mode 契约已从旧的 "ai" 修正为 PRD 10.2 的三值语义
// （generated | retrieval | fallback）。这里断言"确实由模型生成"，
// 而不是接受任何非空值 —— 否则会掩盖"其实走了降级"的情况。
const SUMMARY_MODES = ["generated", "retrieval", "fallback"];

await check("summary 4 字段非空", async () => {
  const r = await post("/api/summary", {
    firstChoice: "support_quit",
    secondChoice: "leave_now",
    positionChange: "slightly_changed",
    respondedSeatIds: ["action"],
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  for (const f of ["consensus", "disagreement", "hiddenAssumption", "openQuestion", "trajectory"]) {
    assert(j[f], `summary.${f} 缺失`);
  }
  assert(
    SUMMARY_MODES.includes(j.mode),
    `summary.mode 应为 ${SUMMARY_MODES.join("|")}，实际 ${j.mode}`,
  );
  assert.equal(j.mode, "generated", `期望实调模型（generated），实际 ${j.mode}`);
});

// 7. summary 4 字段都来自真实知乎（mode=ai + 长度 > 10）
await check("summary 内容是真实回答", async () => {
  const r = await post("/api/summary", {
    firstChoice: "oppose_quit",
    secondChoice: "wait_offer",
    positionChange: "unchanged",
    respondedSeatIds: ["realist"],
  });
  const j = await r.json();
  for (const f of ["consensus", "disagreement", "hiddenAssumption", "openQuestion"]) {
    assert(j[f].length >= 10, `${f} 太短: ${j[f].length}`);
  }
  assert(j.sourceUrls && j.sourceUrls.length > 0, "summary sourceUrls 缺失");
});

// 8. trajectory 三段都有
await check("summary trajectory 三段", async () => {
  const r = await post("/api/summary", {
    firstChoice: "depends",
    secondChoice: "set_deadline",
    positionChange: "changed",
    respondedSeatIds: ["conditional"],
  });
  const j = await r.json();
  for (const t of ["before", "during", "after"]) {
    assert(j.trajectory[t], `trajectory.${t} 缺失`);
  }
});

// 9. summary 400
await check("summary 缺 secondChoice → 400", async () => {
  const r = await post("/api/summary", { firstChoice: "support_quit", positionChange: "unchanged", respondedSeatIds: [] });
  assert.equal(r.status, 400);
});

// —— /api/topics ——

// 10. /api/topics 返回当前 topics.json 的话题数量
await check("/api/topics → topics.json 话题数量", async () => {
  const r = await fetch(base + "/api/topics");
  assert.equal(r.status, 200);
  const j = await r.json();
  assert(
    j.topics && j.topics.length === expectedTopicCount,
    `expected ${expectedTopicCount}, got ${j.topics?.length}`,
  );
  // 每条有 id / title / sourceCount
  for (const t of j.topics) {
    assert(t.id, "topic.id missing");
    assert(t.title, "topic.title missing");
    assert(typeof t.sourceCount === "number", "topic.sourceCount not number");
  }
});

console.log(`\nPASS: ${pass}/${total}`);
if (pass < total) process.exit(1);
