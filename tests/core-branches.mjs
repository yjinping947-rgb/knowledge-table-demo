import assert from "node:assert/strict";

const base = "http://127.0.0.1:3000";
const firstChoices = ["support_quit", "oppose_quit", "depends"];
const secondChoices = ["leave_now", "wait_offer", "set_deadline"];
const allowed = {
  action: ["S01", "S02", "S03"], realist: ["S04", "S05", "S06"], conditional: ["S07", "S08", "S09"]
};
const expectedFirst = { support_quit: "realist", oppose_quit: "action", depends: "action" };

async function post(path, body) {
  return fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

for (const firstChoice of firstChoices) {
  const firstRes = await post("/api/discuss", { round: 1, firstChoice, secondChoice: null, respondedSeatIds: [] });
  assert.equal(firstRes.status, 200);
  const first = await firstRes.json();
  assert.equal(first.mode, "fallback");
  assert.equal(first.selectedSeatId, expectedFirst[firstChoice]);
  assert(first.sourceIds.every((id) => allowed[first.selectedSeatId].includes(id)));

  for (const secondChoice of secondChoices) {
    const secondRes = await post("/api/discuss", { round: 2, firstChoice, secondChoice, respondedSeatIds: [first.selectedSeatId] });
    assert.equal(secondRes.status, 200);
    const second = await secondRes.json();
    assert.equal(second.mode, "fallback");
    assert(second.sourceIds.every((id) => allowed[second.selectedSeatId].includes(id)));
    const summaryRes = await post("/api/summary", { firstChoice, secondChoice, positionChange: "slightly_changed", respondedSeatIds: [first.selectedSeatId, second.selectedSeatId] });
    assert.equal(summaryRes.status, 200);
    const summary = await summaryRes.json();
    assert.equal(summary.mode, "fallback");
    for (const key of ["consensus", "disagreement", "hiddenAssumption", "trajectory", "openQuestion"]) assert(summary[key]);
  }
}

const bad = await post("/api/discuss", { round: 2, firstChoice: "invalid", respondedSeatIds: [] });
assert.equal(bad.status, 400);
console.log("PASS: 3 first-round branches, 9 combined branches, 9 summaries, source constraints, invalid input");
