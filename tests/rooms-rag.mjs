// tests/rooms-rag.mjs
// 20 房间 RAG 路径自动化测试。
// 期望从 .harness/contracts/answer.md 读。
// 详见 .harness/INDEX.md 第 5 节 + .harness/contracts/answer.md。
//
// 启动方式：
//   npm run build && npm run start &
//   node tests/rooms-rag.mjs
//
// 覆盖：
// - GET /api/answer 返回 20 个房间
// - GET /api/answer?roomId=r01 返回单个房间
// - GET /api/answer?roomId=invalid 返回 404
// - POST /api/answer { question } 返回 answer + retrieved
// - POST /api/answer { question, roomId } top[0] 是该答主语料
// - POST /api/answer 缺 question 返回 400
// - POST /api/answer roomId 不存在返回 404 / 错误信息
// - ai / fallback 两种模式都不抛错

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = process.env.BASE_URL || "http://127.0.0.1:3000";

const contractPath = resolve(__dirname, "../.harness/contracts/answer.md");
const contract = await readFile(contractPath, "utf-8");
if (!contract.includes("POST /api/answer") || !contract.includes("GET  /api/answer")) {
  throw new Error("contract mismatch: expected POST + GET /api/answer");
}

async function get(path) {
  return fetch(base + path, { method: "GET" });
}

async function post(path, body) {
  return fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

let pass = 0;
const fail = [];

// —— 1. GET /api/answer ——
{
  const r = await get("/api/answer");
  assert.equal(r.status, 200, "GET /api/answer status");
  const j = await r.json();
  assert(Array.isArray(j.rooms), "GET /api/answer should return { rooms: [] }");
  assert(j.rooms.length >= 20, `expected >= 20 rooms, got ${j.rooms.length}`);
  // 每个房间必须有 id / title / author
  for (const room of j.rooms) {
    assert(room.id, "room.id missing");
    assert(room.title, "room.title missing");
    assert(room.author, "room.author missing");
  }
  pass++;
  console.log(`[1] GET /api/answer → 200, ${j.rooms.length} rooms`);
}

// —— 2. GET /api/answer?roomId=r01 ——
{
  const r = await get("/api/answer?roomId=r01");
  assert.equal(r.status, 200, "GET /api/answer?roomId=r01 status");
  const room = await r.json();
  assert.equal(room.id, "r01", "roomId mismatch");
  assert(room.title, "room.title missing");
  assert(room.excerpt, "room.excerpt missing");
  assert(room.sourceUrl, "room.sourceUrl missing");
  pass++;
  console.log(`[2] GET /api/answer?roomId=r01 → 200, room=${room.author}`);
}

// —— 3. GET /api/answer?roomId=invalid ——
{
  const r = await get("/api/answer?roomId=zzz_nonexistent");
  assert.equal(r.status, 404, "GET /api/answer?roomId=invalid should 404");
  const j = await r.json();
  assert(j.error, "should return { error }");
  pass++;
  console.log(`[3] GET /api/answer?roomId=invalid → 404, error=${j.error}`);
}

// —— 4. POST /api/answer { question } ——
{
  const r = await post("/api/answer", { question: "我该裸辞吗？" });
  assert.equal(r.status, 200, "POST /api/answer status");
  const j = await r.json();
  assert(j.answer, "answer missing");
  assert(Array.isArray(j.retrieved), "retrieved should be array");
  assert(j.retrieved.length > 0, "retrieved should be non-empty");
  assert(["ai", "fallback"].includes(j.mode), `mode should be ai|fallback, got ${j.mode}`);
  // retrieved 每条必须有 contentId / title / author / score
  for (const it of j.retrieved) {
    assert(it.contentId, "retrieved item contentId missing");
    assert(it.title, "retrieved item title missing");
    assert(it.author, "retrieved item author missing");
    assert(typeof it.score === "number", "retrieved item score should be number");
  }
  pass++;
  console.log(`[4] POST /api/answer { question } → 200, mode=${j.mode}, retrieved=${j.retrieved.length}`);
}

// —— 5. POST /api/answer { question, roomId: r01 } ——
{
  const r = await post("/api/answer", { question: "我该听你的建议吗？", roomId: "r01" });
  assert.equal(r.status, 200, "POST /api/answer with roomId status");
  const j = await r.json();
  assert(j.answer, "answer missing");
  assert(j.retrieved.length > 0, "retrieved should be non-empty");
  // top[0] 必须与 room.corpusId 对应（人设核心）
  const top0 = j.retrieved[0];
  assert(top0, "retrieved[0] missing");
  // 路径：先 listRooms 拿 r01.corpusId
  const listRes = await get("/api/answer");
  const list = await listRes.json();
  const r01 = list.rooms.find((x) => x.id === "r01");
  assert(r01, "r01 not in room list");
  assert.equal(top0.contentId, r01.corpusId, `top[0].contentId should equal room.corpusId (${r01.corpusId}), got ${top0.contentId}`);
  pass++;
  console.log(`[5] POST /api/answer with roomId → 200, top[0] is room corpus (mode=${j.mode})`);
}

// —— 6. POST /api/answer 缺 question ——
{
  const r = await post("/api/answer", {});
  assert.equal(r.status, 400, "POST /api/answer without question should 400");
  const j = await r.json();
  assert(j.error, "should return { error }");
  pass++;
  console.log(`[6] POST /api/answer (no question) → 400, error=${j.error}`);
}

// —— 7. POST /api/answer question 类型错 ——
{
  const r = await post("/api/answer", { question: 12345 });
  assert.equal(r.status, 400, "POST /api/answer with non-string question should 400");
  pass++;
  console.log(`[7] POST /api/answer (question=number) → 400`);
}

// —— 8. POST /api/answer roomId 不存在 ——
{
  const r = await post("/api/answer", { question: "test", roomId: "zzz_nonexistent" });
  assert.equal(r.status, 200, "POST /api/answer with invalid roomId should still 200 (returns 'room not exist' message)");
  const j = await r.json();
  assert(j.answer.includes("不存在") || j.mode === "fallback", "should indicate room not exist");
  pass++;
  console.log(`[8] POST /api/answer (invalid roomId) → 200 with not-exist message`);
}

if (fail.length) {
  console.error(`\nFAIL: ${fail.length}`);
  for (const f of fail) console.error(f);
  process.exit(1);
}
console.log(`\nPASS: ${pass} RAG path checks (rooms list / single room / 404 / question / roomId / 400 / type error / invalid roomId)`);
