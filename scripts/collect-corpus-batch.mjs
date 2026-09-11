// scripts/collect-corpus-batch.mjs
// 20 话题 × 3 派 = 60 次 search。
// 数据存 src/data/topics.json：{ T01: { title, seats: { action: [...], realist: [...], conditional: [...] } } }

import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const cli = "C:\\Users\\HUAWEI\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe";

// 20 话题（用户已确认）
const TOPICS = [
  { id: "T01", title: "裸辞",              keywords: ["裸辞"] },
  { id: "T02", title: "跳槽涨薪",          keywords: ["跳槽 涨薪"] },
  { id: "T03", title: "35岁危机",          keywords: ["35岁 程序员", "35岁 职业"] },
  { id: "T04", title: "工作倦怠",          keywords: ["工作 倦怠", "职场 内耗"] },
  { id: "T05", title: "副业赚钱",          keywords: ["副业", "下班 兼职"] },
  { id: "T06", title: "大厂 vs 小公司",    keywords: ["大厂 小公司", "大厂 跳槽"] },
  { id: "T07", title: "转行",              keywords: ["转行", "跨行 求职"] },
  { id: "T08", title: "学历贬值",          keywords: ["学历 贬值", "考研 值得"] },
  { id: "T09", title: "体制内",            keywords: ["体制内 辞职", "公务员 离职"] },
  { id: "T10", title: "职场晋升",          keywords: ["职场 晋升", "升职 加薪"] },
  { id: "T11", title: "工作与抑郁",        keywords: ["工作 抑郁", "职场 心理"] },
  { id: "T12", title: "婚姻相亲",          keywords: ["结婚 相亲", "婚姻 现实"] },
  { id: "T13", title: "买房房贷",          keywords: ["买房 房贷", "年轻人 买房"] },
  { id: "T14", title: "消费降级",          keywords: ["消费降级", "存钱 年轻人"] },
  { id: "T15", title: "父母关系",          keywords: ["父母 关系", "原生家庭"] },
  { id: "T16", title: "同事边界",          keywords: ["同事 边界", "职场 社交"] },
  { id: "T17", title: "AI时代能力",        keywords: ["AI 时代", "AI 替代 程序员"] },
  { id: "T18", title: "远程工作",          keywords: ["远程工作", "数字游民"] },
  { id: "T19", title: "自媒体IP",          keywords: ["自媒体", "个人 IP"] },
  { id: "T20", title: "行业选择",          keywords: ["行业 选择", "互联网 金融 教培"] },
];

const SEATS = [
  { id: "action",      mods: ["立刻", "立即", "马上", "必须"] },
  { id: "realist",     mods: ["现实", "风险", "代价", "经济"] },
  { id: "conditional", mods: ["条件", "看情况", "策略", "前提"] },
];

const SEARCH_PER_QUERY = 10;

// 用 (topicId, seat) → 数组
const results = {};
for (const t of TOPICS) results[t.id] = { id: t.id, title: t.title, seats: { action: [], realist: [], conditional: [] } };

let totalRaw = 0;
let totalUnique = 0;
const seenGlobal = new Set();
// 同 (topic, seat) 内的 contentId 去重
const seenInSlot = new Map(); // key = `${t.id}/${s.id}` → Set<contentId>

let queryCount = 0;
const TOTAL_QUERIES = TOPICS.length * SEATS.length * 2; // 每个组合跑 2 次
const t0 = Date.now();

for (const t of TOPICS) {
  for (const s of SEATS) {
    const slotKey = `${t.id}/${s.id}`;
    if (!seenInSlot.has(slotKey)) seenInSlot.set(slotKey, new Set());

    // 每个 (topic, seat) 跑 2 次：一次带 modifier，一次纯 keyword（兜底广撒网）
    const queries = [
      `${t.keywords[0]} ${s.mods[0]}`,
      t.keywords[1] ?? t.keywords[0],
    ];

    for (const query of queries) {
      queryCount++;
      const tStart = Date.now();
      const r = spawnSync(cli, ["search", "zhihu", "--query", query, "--count", String(SEARCH_PER_QUERY)], {
        encoding: "buffer",
      });
      const dt = Date.now() - tStart;

      if (r.status !== 0) {
        console.error(`[${queryCount}/${TOTAL_QUERIES}] ${slotKey} "${query}" FAILED (${dt}ms): status=${r.status}`);
        continue;
      }
      const parsed = JSON.parse(r.stdout.toString());
      const items = parsed.Data?.Items ?? [];
      let added = 0;
      for (const it of items) {
        const slot = seenInSlot.get(slotKey);
        if (!slot || slot.has(it.ContentID)) continue;
        slot.add(it.ContentID);
        results[t.id].seats[s.id].push({
          contentId: it.ContentID,
          title: it.Title,
          author: it.AuthorName,
          contentText: it.ContentText,
          url: it.Url,
          voteUpCount: it.VoteUpCount,
          commentCount: it.CommentCount,
          authorityLevel: it.AuthorityLevel,
        });
        seenGlobal.add(it.ContentID);
        added++;
      }
      totalRaw += items.length;
      totalUnique = seenGlobal.size;
      console.log(`[${queryCount}/${TOTAL_QUERIES}] ${slotKey} "${query}" [${dt}ms] +${added} (raw=${totalRaw}, unique=${totalUnique})`);
    }
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n=== done in ${elapsed}s ===`);

const outPath = resolve(projectRoot, "src/data/topics.json");
await writeFile(outPath, JSON.stringify(results, null, 2), "utf8");
console.log(`wrote ${outPath}`);

// 统计
let totalSources = 0;
for (const t of TOPICS) {
  const a = results[t.id].seats.action.length;
  const r = results[t.id].seats.realist.length;
  const c = results[t.id].seats.conditional.length;
  const sum = a + r + c;
  totalSources += sum;
  console.log(`  ${t.id}  ${t.title.padEnd(14)}  action=${a}  realist=${r}  conditional=${c}  total=${sum}`);
}
console.log(`\nTotal sources: ${totalSources}, unique contentIds: ${seenGlobal.size}`);
