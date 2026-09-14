// 审计同一话题三个席位的来源区分度。只读，不修改语料。
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const topicsPath = resolve(root, "src/data/topics.json");
const reportPath = resolve(root, "docs/corpus-diversity-2026-09-14.md");
const topics = JSON.parse(await readFile(topicsPath, "utf8"));
const seats = ["action", "realist", "conditional"];
const pairs = [["action", "realist"], ["action", "conditional"], ["realist", "conditional"]];
const mainTopics = Object.values(topics).filter((topic) => !topic.hidden);

function overlap(a, b) {
  const left = new Set(a);
  const right = new Set(b);
  const intersection = [...left].filter((id) => right.has(id)).length;
  const union = new Set([...left, ...right]).size;
  return { intersection, union, ratio: union ? intersection / union : 0 };
}

const reports = mainTopics.map((topic) => {
  const ids = Object.fromEntries(seats.map((seat) => [seat, (topic.seats?.[seat] ?? []).map((source) => source.contentId).filter(Boolean)]));
  const pairReports = pairs.map(([left, right]) => ({ left, right, ...overlap(ids[left], ids[right]) }));
  const all = seats.flatMap((seat) => ids[seat]);
  return { id: topic.id, title: topic.title, sourceCount: all.length, uniqueContentIds: new Set(all).size, duplicatePlacements: all.length - new Set(all).size, pairReports, maxPairOverlap: Math.max(...pairReports.map((pair) => pair.ratio)) };
});

const pairTotals = Object.fromEntries(pairs.map(([left, right]) => {
  const values = reports.flatMap((topic) => topic.pairReports).filter((pair) => pair.left === left && pair.right === right);
  return [`${left}/${right}`, { sharedPlacements: values.reduce((sum, pair) => sum + pair.intersection, 0), averageJaccard: values.reduce((sum, pair) => sum + pair.ratio, 0) / values.length, maxJaccard: Math.max(...values.map((pair) => pair.ratio)) }];
}));

const flagged = reports.filter((topic) => topic.maxPairOverlap > 0.25);
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), mainTopicCount: reports.length, pairTotals, flaggedTopics: flagged.map(({ id, title, maxPairOverlap }) => ({ id, title, maxPairOverlap })) }, null, 2));

const rows = reports.map((topic) => `| ${topic.id} | ${topic.title} | ${topic.sourceCount} | ${topic.uniqueContentIds} | ${topic.duplicatePlacements} | ${topic.pairReports.map((pair) => `${pair.left}/${pair.right}: ${pair.intersection}`).join("；")} |`).join("\n");
const report = `# 三席语料区分度审计（2026-09-14）\n\n本报告为只读审计，不修改 src/data/topics.json。跨席位重复来源保留为历史事实，不能仅凭重复数删除。\n\n- 正式话题：${reports.length}\n- 关注阈值：任一席位对 Jaccard 重叠率 > 25%\n- 被标记话题：${flagged.length}\n\n## 席位对汇总\n\n| 席位对 | 共享放置数 | 平均 Jaccard | 最大 Jaccard |\n|---|---:|---:|---:|\n${Object.entries(pairTotals).map(([pair, value]) => `| ${pair} | ${value.sharedPlacements} | ${(value.averageJaccard * 100).toFixed(1)}% | ${(value.maxJaccard * 100).toFixed(1)}% |`).join("\n")}\n\n## 话题明细\n\n| 话题 | 标题 | 放置数 | 唯一来源 | 重复放置 | 席位对共享数 |\n|---|---|---:|---:|---:|---|\n${rows}\n\n## 结论\n\n重复来源是质量信号，不是自动删除条件；下一步需抽查高重叠话题的正文是否确实支持不同立场。`;
await writeFile(reportPath, report, "utf8");
console.error(`wrote ${reportPath}`);
