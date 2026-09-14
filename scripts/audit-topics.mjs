// 语料审计：只读检查 topics.json，不修改数据或调用外部 API。
// 用法：node scripts/audit-topics.mjs [--strict]

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const strict = process.argv.includes("--strict");
const topicsPath = resolve(process.cwd(), "src/data/topics.json");
const topics = JSON.parse(await readFile(topicsPath, "utf8"));
const requiredSeats = ["action", "realist", "conditional"];
const requiredFields = ["contentId", "title", "author", "contentText", "url", "voteUpCount", "commentCount", "authorityLevel"];
const ids = new Map();
const report = {
  topicCount: Object.keys(topics).length,
  mainTopicCount: 0,
  extraTopics: [],
  totalRecords: 0,
  uniqueContentIds: 0,
  duplicatePlacements: 0,
  missingFields: [],
  urlParameterCounts: {},
  seatCounts: {},
};

for (const [topicId, topic] of Object.entries(topics)) {
  const isMainTopic = /^T(?:0[1-9]|1[0-9]|20)$/.test(topicId);
  if (isMainTopic) report.mainTopicCount += 1;
  else report.extraTopics.push({ id: topicId, title: topic?.title ?? "", hidden: topic?.hidden === true });

  const seats = topic?.seats ?? {};
  report.seatCounts[topicId] = {};
  for (const seat of requiredSeats) {
    const entries = Array.isArray(seats[seat]) ? seats[seat] : [];
    report.seatCounts[topicId][seat] = entries.length;
    for (const [index, source] of entries.entries()) {
      report.totalRecords += 1;
      const missing = requiredFields.filter((field) => source?.[field] === undefined || source?.[field] === null || source?.[field] === "");
      if (missing.length) report.missingFields.push({ topicId, seat, index, missing });

      const url = typeof source?.url === "string" ? source.url : "";
      // 历史采集结果使用官方 CLI 返回的 utm_medium=openapi_platform；
      // 新增来源按 add-corpus skill 统一使用 utm=openai_platform。
      const parameter = /[?&]utm=openai_platform(?:&|$)/.test(url)
        ? "utm=openai_platform (new-source)"
        : /[?&]utm_medium=openapi_platform(?:&|$)/.test(url)
          ? "utm_medium=openapi_platform (historical-official)"
          : "missing_or_other";
      report.urlParameterCounts[parameter] = (report.urlParameterCounts[parameter] ?? 0) + 1;

      const contentId = String(source?.contentId ?? "");
      if (contentId) {
        if (ids.has(contentId)) report.duplicatePlacements += 1;
        ids.set(contentId, `${topicId}/${seat}/${index}`);
      }
    }
  }
}

report.uniqueContentIds = ids.size;
console.log(JSON.stringify(report, null, 2));

if (strict) {
  const underfilled = Object.entries(report.seatCounts)
    .filter(([topicId]) => /^T(?:0[1-9]|1[0-9]|20)$/.test(topicId))
    .flatMap(([topicId, counts]) => Object.entries(counts).filter(([, count]) => count < 20).map(([seat, count]) => `${topicId}/${seat}=${count}`));
  const failures = [];
  if (report.mainTopicCount !== 20) failures.push(`expected 20 main topics, got ${report.mainTopicCount}`);
  const visibleExtras = report.extraTopics.filter((item) => !item.hidden);
  if (visibleExtras.length) failures.push(`extra topics: ${visibleExtras.map((item) => item.id).join(", ")}`);
  if (underfilled.length) failures.push(`underfilled seats: ${underfilled.join(", ")}`);
  if (report.missingFields.length) failures.push(`records with missing fields: ${report.missingFields.length}`);
  if (failures.length) {
    console.error(`AUDIT_FAIL: ${failures.join("; ")}`);
    process.exitCode = 1;
  } else {
    console.error("AUDIT_PASS: 20 topics × 3 seats, all seats have at least 20 complete records");
  }
}
