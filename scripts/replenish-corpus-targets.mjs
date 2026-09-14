// 定向补齐 topics.json 中不足 20 条的席位，并从知乎搜索结果精确恢复缺失作者。
// 默认仅生成候选报告；传入 --apply 才会写入 topics.json。

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const topicsPath = resolve(projectRoot, "src/data/topics.json");
const cacheDir = resolve(projectRoot, ".tmp/corpus-search-cache");
const reportPath = resolve(projectRoot, ".tmp/corpus-replenishment-report.json");
const apply = process.argv.includes("--apply");
const cli = process.env.ZHIHU_CLI_PATH
  || (process.platform === "win32"
    ? resolve(process.env.LOCALAPPDATA || "", "ZhihuCLI", "current", "zhihu-cli.exe")
    : "zhihu-cli");

const targets = [
  { topicId: "T01", seat: "realist", queries: ["裸辞 经济风险 社保 求职 空窗期"] },
  { topicId: "T02", seat: "action", queries: ["跳槽涨薪 主动争取 机会 谈薪"] },
  { topicId: "T02", seat: "realist", queries: [
    "跳槽涨薪 成本 风险 稳定性 职业发展",
    "频繁跳槽 涨薪 履历 稳定 HR 风险",
  ] },
  { topicId: "T05", seat: "action", queries: ["普通人副业 实操 开始 赚钱"] },
  { topicId: "T05", seat: "realist", queries: [
    "副业风险 骗局 收益 成本",
    "普通人做副业 被骗 风险 收益不稳定",
  ] },
  { topicId: "T07", seat: "realist", queries: ["转行 风险 成本 年龄 就业"] },
  { topicId: "T07", seat: "conditional", queries: ["转行 条件 准备 路径 适合"] },
  { topicId: "T08", seat: "action", queries: ["学历贬值 提升能力 求职 行动"] },
  { topicId: "T08", seat: "realist", queries: ["学历贬值 就业市场 现实 招聘"] },
  { topicId: "T09", seat: "action", queries: ["体制内辞职 转型 准备 行动"] },
  { topicId: "T18", seat: "conditional", queries: ["远程工作 条件 自律 适合人群"] },
];

const authorRecoveryQueries = [
  "35岁 程序员 职业危机 转型 出路",
  "程序员快35了 考虑做独立开发者 有没有搞头",
  "35岁了才来学编程 是不是晚了",
  "AI时代 35岁程序员的新机会在哪里",
  "35岁以上的大龄程序员该何去何从",
  "35岁程序员 最怕的不是年纪 28岁时的工作方式",
  "35岁以后的程序员何去何从",
];
const topics = JSON.parse(await readFile(topicsPath, "utf8"));
await mkdir(cacheDir, { recursive: true });

const globalIds = new Set();
for (const topic of Object.values(topics)) {
  for (const sources of Object.values(topic.seats ?? {})) {
    for (const source of sources) if (source.contentId) globalIds.add(String(source.contentId));
  }
}

function cachePath(query) {
  const hash = createHash("sha256").update(query).digest("hex").slice(0, 20);
  return resolve(cacheDir, `${hash}.json`);
}

async function search(query) {
  const file = cachePath(query);
  try {
    const payload = JSON.parse(await readFile(file, "utf8"));
    return { payload, cached: true };
  } catch {
    // Cache miss: make one bounded CLI request and persist only a successful response.
  }
  const result = spawnSync(cli, ["search", "zhihu", "--query", query, "--count", "10"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
    timeout: 15_000,
  });
  if (result.status !== 0) throw new Error(`search failed for ${query}: exit=${result.status}`);
  const payload = JSON.parse(result.stdout);
  if (payload.Code !== 0) throw new Error(`search failed for ${query}: ${payload.Code} ${payload.Message || ""}`);
  await writeFile(file, JSON.stringify(payload), "utf8");
  return { payload, cached: false };
}

function normalize(item) {
  const contentId = String(item?.ContentID ?? item?.ContentId ?? "").trim();
  const title = String(item?.Title ?? "").trim();
  const author = String(item?.AuthorName ?? "").trim();
  const contentText = String(item?.ContentText ?? "").trim();
  const rawUrl = String(item?.Url ?? "").trim();
  if (!contentId || !title || !author || contentText.length < 80 || !/^https:\/\/(?:www\.)?(?:zhihu\.com|zhuanlan\.zhihu\.com)\//.test(rawUrl)) return null;
  const url = /[?&]utm=openai_platform(?:&|$)/.test(rawUrl)
    ? rawUrl
    : `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}utm=openai_platform`;
  return {
    contentId,
    title,
    author,
    contentText,
    url,
    voteUpCount: Math.max(0, Number(item?.VoteUpCount) || 0),
    commentCount: Math.max(0, Number(item?.CommentCount) || 0),
    authorityLevel: String(item?.AuthorityLevel ?? "0"),
  };
}

function items(payload) {
  const raw = payload?.Data?.Items;
  return Array.isArray(raw) ? raw.map(normalize).filter(Boolean) : [];
}

const report = { apply, searched: [], targets: [], authorRecovery: { matched: [], remaining: [] } };

for (const target of targets) {
  const slot = topics[target.topicId]?.seats?.[target.seat];
  if (!Array.isArray(slot)) throw new Error(`missing slot ${target.topicId}/${target.seat}`);
  const before = slot.length;
  const slotIds = new Set(slot.map((source) => String(source.contentId)));
  const candidates = [];
  for (const query of target.queries) {
    if (before + candidates.length >= 20) break;
    const result = await search(query);
    report.searched.push({ query, cached: result.cached });
    for (const source of items(result.payload)) {
      if (slotIds.has(source.contentId) || candidates.some((item) => item.contentId === source.contentId)) continue;
      // 优先确保本次新增来源在整个语料库中也是新的，提升观点多样性。
      if (globalIds.has(source.contentId)) continue;
      candidates.push(source);
      if (before + candidates.length >= 20) break;
    }
  }
  const additions = candidates.slice(0, Math.max(0, 20 - before));
  if (apply) {
    slot.push(...additions);
    for (const source of additions) globalIds.add(source.contentId);
  }
  report.targets.push({ topicId: target.topicId, seat: target.seat, before, additions, after: before + additions.length });
}

const missingAuthors = topics.T03?.seats?.action?.filter((source) => !String(source.author ?? "").trim()) ?? [];
const recoveredById = new Map();
for (const query of authorRecoveryQueries) {
  if (!missingAuthors.length) break;
  const result = await search(query);
  report.searched.push({ query, cached: result.cached });
  for (const source of items(result.payload)) recoveredById.set(source.contentId, source.author);
}
for (const source of missingAuthors) {
  const author = recoveredById.get(String(source.contentId));
  if (!author) continue;
  if (apply) source.author = author;
  report.authorRecovery.matched.push({ contentId: String(source.contentId), author });
}
report.authorRecovery.remaining = missingAuthors
  .filter((source) => !recoveredById.has(String(source.contentId)))
  .map((source) => ({ contentId: String(source.contentId), title: source.title }));

await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
if (apply) await writeFile(topicsPath, JSON.stringify(topics, null, 2), "utf8");

console.log(JSON.stringify({
  mode: apply ? "applied" : "dry-run",
  apiCalls: report.searched.filter((item) => !item.cached).length,
  cacheHits: report.searched.filter((item) => item.cached).length,
  additions: report.targets.reduce((sum, target) => sum + target.additions.length, 0),
  filledSlots: report.targets.filter((target) => target.after >= 20).length,
  recoveredAuthors: report.authorRecovery.matched.length,
  remainingAuthors: report.authorRecovery.remaining.length,
  reportPath,
}, null, 2));
