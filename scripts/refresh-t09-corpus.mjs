// T09 定向清洗：移除明显把“体制内”变成泛职业/独立游戏的重复来源，
// 使用本地缓存的体制内知乎实时结果补位。默认 dry-run，--apply 才写回。
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const topicsPath = resolve(root, "src/data/topics.json");
const cachePath = resolve(root, ".tmp/zhihu-search-cache.json");
const reportPath = resolve(root, ".tmp/t09-cleanup-report.json");
const apply = process.argv.includes("--apply");
const topics = JSON.parse(await readFile(topicsPath, "utf8"));
const cache = JSON.parse(await readFile(cachePath, "utf8").catch(() => "{}"));

const directTerms = ["体制内", "公务员", "事业单位", "编制", "机关", "部委", "公职", "考公", "辞去公职"];
const offTopicIds = new Set(["-2603571835324842449", "-816464129739297359", "-1056039919861904672"]);
const narrowIds = {
  action: new Set(["7805329443528082418", "-4717253647488719505", "5733652825976634926"]),
  realist: new Set(["-4299251669079387419", "635999332161066479", "-329176735969828015"]),
  conditional: new Set(["-8348932035448928848", "8119590056413641693", "-6395434207086713014"]),
};
const preferredIds = {
  action: ["2366397022026510276", "5226417355525573222", "4387617899753388755"],
  realist: ["-8827274266155416327", "-1441071160332493975", "-2333442499589035961"],
  conditional: ["3013535657409668703", "-7071643259831832569", "-4827129988196741554"],
};
const textOf = (source) => `${source.title} ${source.contentText}`.toLowerCase();
const direct = (source) => directTerms.some((term) => textOf(source).includes(term.toLowerCase()));
const isOffTopic = (source, seat) => offTopicIds.has(String(source.contentId)) || narrowIds[seat].has(String(source.contentId));

const cached = [];
const cachedIds = new Set();
for (const source of Object.values(cache).flatMap((entry) => entry?.value?.sources ?? [])) {
  // 只接受标题明确属于体制内的结果，避免正文中偶然提到“体制内”的其他主题被混入。
  const title = String(source?.title ?? "").toLowerCase();
  const id = String(source?.contentId ?? "");
  if (source?.sourceProvider !== "zhihu-realtime" || !direct(source) || !directTerms.some((term) => title.includes(term.toLowerCase())) || !id || cachedIds.has(id)) continue;
  cachedIds.add(id);
  cached.push(source);
}
const globalIds = new Set(Object.values(topics).flatMap((topic) => Object.values(topic.seats ?? {}).flatMap((sources) => sources.map((source) => String(source.contentId)))));
const before = structuredClone(topics.T09.seats);
const removed = [];
const additions = [];
for (const seat of ["action", "realist", "conditional"]) {
  const current = topics.T09.seats[seat] ?? [];
  const kept = current.filter((source) => {
    if (!isOffTopic(source, seat)) return true;
    removed.push({ seat, contentId: String(source.contentId), title: source.title, reason: offTopicIds.has(String(source.contentId)) ? "同一篇公务员离职/独立游戏文章重复出现在三个席位，且主旨偏向创业失败而非体制内" : "内容过度集中在辞职流程或单个离职案例，替换为体制内工作方式、环境与适配条件" });
    return false;
  });
  const needed = 20 - kept.length;
  const candidates = [];
  const orderedCandidates = [...preferredIds[seat].map((id) => cached.find((source) => String(source.contentId) === id)).filter(Boolean), ...cached];
  for (const source of orderedCandidates) {
    const id = String(source.contentId);
    if (candidates.length >= Math.max(0, needed)) break;
    if (globalIds.has(id) || kept.some((item) => String(item.contentId) === id)) continue;
    candidates.push(source);
    globalIds.add(id);
  }
  if (apply) topics.T09.seats[seat] = [...kept, ...candidates];
  additions.push({ seat, count: candidates.length, sources: candidates.map((source) => ({ contentId: source.contentId, title: source.title, author: source.author, url: source.url })) });
}
const after = Object.fromEntries(["action", "realist", "conditional"].map((seat) => [seat, apply ? topics.T09.seats[seat].length : before[seat].length - removed.filter((item) => item.seat === seat).length + additions.find((item) => item.seat === seat).count]));
const report = { mode: apply ? "apply" : "dry-run", generatedAt: new Date().toISOString(), before: Object.fromEntries(Object.entries(before).map(([seat, sources]) => [seat, sources.length])), removed, additions, after, note: "补位仅使用本地缓存的知乎实时来源；未新增 API 调用。" };
await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
if (apply) await writeFile(topicsPath, JSON.stringify(topics, null, 2), "utf8");
console.log(JSON.stringify({ mode: report.mode, removed: removed.length, additions: additions.reduce((n, item) => n + item.count, 0), after, reportPath }, null, 2));
