// T04 定向语料清洗：默认 dry-run；--apply 才会写回 topics.json。
// 只从当前 T04 中移除明显偏题的条目，并从已缓存的知乎搜索结果补位。
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const topicsPath = resolve(root, "src/data/topics.json");
const cachePath = resolve(root, ".tmp/zhihu-search-cache.json");
const reportPath = resolve(root, ".tmp/t04-cleanup-report.json");
const apply = process.argv.includes("--apply");
const topics = JSON.parse(await readFile(topicsPath, "utf8"));
const cache = JSON.parse(await readFile(cachePath, "utf8").catch(() => "{}"));

const coreTerms = ["职业倦怠", "工作倦怠", "职场内耗", "精疲力竭", "疲惫", "心累", "不想上班", "工作压力", "工作热情", "班味", "burnout", "耗竭", "麻木", "工作意义", "工作动力", "工作状态"];
const sideOnlyTerms = ["婚姻", "相亲", "买房", "房贷", "自媒体", "个人ip", "公务员", "体制内", "学历贬值", "程序员", "跳槽涨薪", "行业选择"];
// 这些条目虽然属于职场相邻问题，但标题/正文重点偏向跳槽、晋升或心理咨询，
// 在 T04 首轮会把“倦怠”稀释掉；用已缓存的同主题实时结果替换。
const replacementIds = {
  action: "-2086768839744956193",
  realist: "-831882899138942958",
  conditional: "6798656481564783786",
};
const termHit = (source, terms) => {
  const text = `${source.title} ${source.contentText}`.toLowerCase();
  return terms.reduce((n, term) => n + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
};
const isCore = (source) => termHit(source, coreTerms) > 0;
const coreTitleTerms = ["职业倦怠", "工作倦怠", "职场倦怠", "工作疲惫", "工作压力", "不想上班", "职场内耗", "班味", "心累"];
const isDirectT04 = (source) => coreTitleTerms.some((term) => source.title.toLowerCase().includes(term.toLowerCase()));
const isClearlyOffTopic = (source) => {
  const title = source.title.toLowerCase();
  const coreInTitle = coreTerms.some((term) => title.includes(term.toLowerCase()));
  const sideInTitle = sideOnlyTerms.some((term) => title.includes(term.toLowerCase()));
  return sideInTitle && !coreInTitle && termHit(source, coreTerms) === 0;
};

function cachedSources() {
  const values = Object.values(cache).flatMap((entry) => entry?.value?.sources ?? []);
  return values.filter((source) => source?.sourceProvider === "zhihu-realtime" && isDirectT04(source));
}

const before = structuredClone(topics.T04.seats);
const removed = [];
const additions = [];
const globalIds = new Set(Object.values(topics).flatMap((topic) => Object.values(topic.seats ?? {}).flatMap((sources) => sources.map((source) => String(source.contentId)))));
for (const seat of ["action", "realist", "conditional"]) {
  const current = topics.T04.seats[seat] ?? [];
  const kept = [];
  for (const source of current) {
    if (isClearlyOffTopic(source) || String(source.contentId) === replacementIds[seat]) {
      removed.push({ seat, contentId: String(source.contentId), title: source.title, reason: isClearlyOffTopic(source) ? "标题和正文均无职业倦怠信号" : "相邻主题优先替换为更直接的倦怠材料" });
    }
    else kept.push(source);
  }
  const needed = Math.max(0, 20 - kept.length);
  const candidates = cachedSources().filter((source) => !globalIds.has(String(source.contentId)) && !kept.some((item) => String(item.contentId) === String(source.contentId))).slice(0, needed);
  for (const source of candidates) globalIds.add(String(source.contentId));
  if (apply) {
    topics.T04.seats[seat] = [...kept, ...candidates];
  }
  additions.push({ seat, count: candidates.length, sources: candidates.map((source) => ({ contentId: source.contentId, title: source.title, author: source.author, url: source.url })) });
}

const report = {
  mode: apply ? "apply" : "dry-run",
  generatedAt: new Date().toISOString(),
  criteria: { coreTerms, sideOnlyTerms },
  before: Object.fromEntries(Object.entries(before).map(([seat, sources]) => [seat, sources.length])),
  removed,
  additions,
  after: Object.fromEntries(["action", "realist", "conditional"].map((seat) => [seat, apply ? topics.T04.seats[seat].length : before[seat].length - removed.filter((item) => item.seat === seat).length + additions.find((item) => item.seat === seat).count])),
  note: "新增来源仅使用本地已缓存的知乎实时结果；若缓存不足，需先配置 Access Secret 后执行定向搜索。",
};
await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
if (apply) await writeFile(topicsPath, JSON.stringify(topics, null, 2), "utf8");
console.log(JSON.stringify({ mode: report.mode, removed: removed.length, additions: additions.reduce((n, item) => n + item.count, 0), after: report.after, reportPath }, null, 2));
