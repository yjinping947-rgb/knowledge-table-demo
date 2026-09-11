// tests/core-branches.mjs
// 27 路径核心回归 + 异常路径 + 长度边界 + 来源约束。
// 期望从 .harness/evals/branches.json 读。
// 详见 .harness/INDEX.md 第 7 节。

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = process.env.BASE_URL || "http://127.0.0.1:3000";

const evalsPath = resolve(__dirname, "../.harness/evals/branches.json");
const evals = JSON.parse(await readFile(evalsPath, "utf-8"));

async function post(path, body) {
  return fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const firstChoices = ["support_quit", "oppose_quit", "depends"];
const secondChoices = ["leave_now", "wait_offer", "set_deadline"];
const positionChanges = ["unchanged", "slightly_changed", "changed"];

let firstCount = 0;
let secondCount = 0;
let summaryCount = 0;

for (const firstChoice of firstChoices) {
  const firstRes = await post("/api/discuss", {
    round: 1,
    firstChoice,
    secondChoice: null,
    respondedSeatIds: [],
  });
  assert.equal(firstRes.status, 200, `first[${firstChoice}] status`);
  const first = await firstRes.json();
  // RAG 模式：reply 来自 1175 条 真实知乎库，sourceIds 是真实 contentId
  assert(["action", "realist", "conditional"].includes(first.selectedSeatId), `first[${firstChoice}] invalid seatId: ${first.selectedSeatId}`);
  assert(Array.isArray(first.sourceIds) && first.sourceIds.length > 0, `first[${firstChoice}] sourceIds missing`);
  assert(first.sourceIds.every((id) => typeof id === "string" && id.length > 0), `first[${firstChoice}] sourceIds invalid`);
  assert(first.reply.length <= evals.lengthLimits.reply, `first[${firstChoice}] reply too long`);
  assert(first.hostComment.length <= evals.lengthLimits.hostComment, `first[${firstChoice}] hostComment too long`);
  firstCount++;

  for (const secondChoice of secondChoices) {
    const secondRes = await post("/api/discuss", {
      round: 2,
      firstChoice,
      secondChoice,
      respondedSeatIds: [first.selectedSeatId],
    });
    assert.equal(secondRes.status, 200, `second[${firstChoice}][${secondChoice}] status`);
    const second = await secondRes.json();
    assert(["action", "realist", "conditional"].includes(second.selectedSeatId), `second[${firstChoice}][${secondChoice}] invalid seatId: ${second.selectedSeatId}`);
    assert(Array.isArray(second.sourceIds) && second.sourceIds.length > 0, `second[${firstChoice}][${secondChoice}] sourceIds missing`);
    assert(second.sourceIds.every((id) => typeof id === "string" && id.length > 0), `second[${firstChoice}][${secondChoice}] sourceIds invalid`);
    assert(second.reply.length <= evals.lengthLimits.reply, `second reply too long`);
    assert(second.hostComment.length <= evals.lengthLimits.hostComment, `second hostComment too long`);
    secondCount++;

    for (const positionChange of positionChanges) {
      const summaryRes = await post("/api/summary", {
        firstChoice,
        secondChoice,
        positionChange,
        respondedSeatIds: [first.selectedSeatId, second.selectedSeatId],
      });
      assert.equal(summaryRes.status, 200, `summary status`);
      const summary = await summaryRes.json();
      for (const key of evals.summaryFields) {
        assert(summary[key], `summary[${firstChoice}][${secondChoice}][${positionChange}] missing ${key}`);
      }
      summaryCount++;
    }
  }
}

const bad = await post("/api/discuss", { round: 2, firstChoice: "invalid", respondedSeatIds: [] });
assert.equal(bad.status, 400, "invalid input should 400");

console.log(
  `PASS: ${firstCount} first-round branches, ${secondCount} combined branches, ${summaryCount} summaries, source constraints, length limits, invalid input`,
);
