// 审计 T01-T20 语料之间的主题串台。
// 这是启发式质量检查，不替代人工阅读：同一回答可以合理涉及多个主题，
// 只有当其他主题的信号接近或超过所属主题，才标为重点复核。
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const topicsPath = resolve(root, "src/data/topics.json");
const reportPath = resolve(root, "docs/corpus-cross-talk-2026-09-14.md");
const topics = JSON.parse(await readFile(topicsPath, "utf8"));

const profiles = {
  T01: ["裸辞", "辞职", "离职", "空窗", "下家", "社保断缴"],
  T02: ["跳槽", "涨薪", "谈薪", "加薪", "换工作"],
  // “程序员”本身不等于 35 岁危机，只有年龄信号才算 T03，避免把所有 AI 编程材料误报为 T03。
  T03: ["35岁", "35 岁", "大龄危机", "年龄危机", "中年危机"],
  T04: ["职业倦怠", "工作倦怠", "职场内耗", "精疲力竭", "疲惫", "心累", "不想上班", "工作压力", "工作热情", "班味", "burnout"],
  T05: ["副业", "兼职", "第二收入", "副收入", "副业赚钱"],
  T06: ["大厂", "小公司", "大公司", "创业公司"],
  T07: ["转行", "跨行", "转型"],
  T08: ["学历", "学历贬值", "考研", "文凭", "本科"],
  T09: ["体制内", "公务员", "事业单位", "编制", "考公"],
  T10: ["晋升", "升职", "管理岗", "加薪", "职场发展"],
  T11: ["抑郁", "焦虑", "心理健康", "心理", "情绪"],
  T12: ["婚姻", "相亲", "结婚", "伴侣", "恋爱"],
  T13: ["买房", "房贷", "首付", "房子", "住房"],
  T14: ["消费降级", "消费", "存钱", "省钱", "消费观"],
  T15: ["父母", "原生家庭", "亲子", "养老"],
  T16: ["同事", "边界", "职场社交", "人际关系"],
  T17: ["AI", "人工智能", "大模型", "程序员替代"],
  T18: ["远程工作", "远程办公", "数字游民", "居家办公"],
  T19: ["自媒体", "个人IP", "账号", "粉丝", "内容创作", "流量"],
  T20: ["行业选择", "行业", "赛道", "互联网", "金融", "教培"],
};

const ids = Object.keys(profiles);
const normalize = (value) => String(value ?? "").toLowerCase();
function score(source, topicId) {
  const title = normalize(source.title);
  const text = normalize(source.contentText);
  const head = text.slice(0, 700);
  return profiles[topicId].reduce((sum, term) => {
    const keyword = term.toLowerCase();
    // 标题和开头更能说明文章主题，正文命中只作为弱信号。
    return sum + (title.includes(keyword) ? 6 : 0) + (head.includes(keyword) ? 2 : 0) + (text.includes(keyword) ? 1 : 0);
  }, 0);
}

const placements = [];
const duplicateMap = new Map();
for (const topicId of ids) {
  const topic = topics[topicId];
  for (const seat of ["action", "realist", "conditional"]) {
    for (const source of topic?.seats?.[seat] ?? []) {
      const placement = { topicId, seat, source, scores: Object.fromEntries(ids.map((id) => [id, score(source, id)])) };
      placements.push(placement);
      const key = String(source.contentId);
      const list = duplicateMap.get(key) ?? [];
      list.push(`${topicId}/${seat}`);
      duplicateMap.set(key, list);
    }
  }
}

const matrix = Object.fromEntries(ids.map((id) => [id, Object.fromEntries(ids.map((other) => [other, 0]))]));
const flagged = [];
for (const item of placements) {
  const own = item.scores[item.topicId];
  const alternatives = ids
    .filter((id) => id !== item.topicId)
    .map((id) => ({ id, score: item.scores[id] }))
    .filter((entry) => entry.score >= 6 && entry.score >= own * 0.9)
    .sort((a, b) => b.score - a.score);
  for (const alternative of alternatives) matrix[item.topicId][alternative.id] += 1;
  if (alternatives.length) {
    flagged.push({
      topicId: item.topicId,
      seat: item.seat,
      contentId: String(item.source.contentId),
      title: item.source.title,
      ownScore: own,
      alternatives,
    });
  }
}

const duplicates = [...duplicateMap.entries()]
  .filter(([, locations]) => locations.length > 1)
  .map(([contentId, locations]) => ({ contentId, locations }));
const totals = Object.fromEntries(ids.map((id) => [id, {
  records: placements.filter((item) => item.topicId === id).length,
  flagged: flagged.filter((item) => item.topicId === id).length,
}]));

const report = {
  generatedAt: new Date().toISOString(),
  method: "title 6 + opening 2 + body 1 per profile-term; heuristic only",
  topicCount: ids.length,
  recordCount: placements.length,
  flaggedCount: flagged.length,
  duplicateContentIds: duplicates.length,
  totals,
  matrix,
  flagged,
  duplicates,
};

console.log(JSON.stringify({
  topicCount: ids.length,
  recordCount: placements.length,
  flaggedCount: flagged.length,
  duplicateContentIds: duplicates.length,
  topPairs: ids.flatMap((from) => ids.filter((to) => to !== from).map((to) => ({ from, to, count: matrix[from][to] })))
    .filter((pair) => pair.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20),
}, null, 2));

const rows = ids.map((from) => `| ${from} | ${profiles[from].join(", ")} | ${totals[from].records} | ${totals[from].flagged} | ${ids.filter((to) => to !== from && matrix[from][to] > 0).map((to) => `${to}: ${matrix[from][to]}`).join("；") || "—"} |`).join("\n");
const flaggedRows = flagged.slice(0, 120).map((item) => `| ${item.topicId} | ${item.seat} | ${item.contentId} | ${item.title.replace(/\|/g, "／")} | ${item.ownScore} | ${item.alternatives.map((entry) => `${entry.id}(${entry.score})`).join(", ")} |`).join("\n");
const duplicateRows = duplicates.slice(0, 120).map((item) => `| ${item.contentId} | ${item.locations.join(", ")} |`).join("\n");
const markdown = `# T01-T20 语料主题串台审计（2026-09-14）

本报告覆盖 20 个公开话题、三席全部语料。它是启发式筛查，不把“文章提到另一个主题”直接判为错误；只有其他主题信号接近所属主题时才进入人工复核。体制内、婚姻、买房等话题之间的自然交叉会被列出，但不能仅凭词命中删除真实来源。

- 记录数：${placements.length}
- 启发式重点复核：${flagged.length}
- 跨话题重复 contentId：${duplicates.length}
- 规则：标题命中权重 6，正文开头 700 字命中权重 2，其余正文命中权重 1；其他主题分数 ≥ 所属主题 90% 且 ≥ 6 才标记。

## 话题汇总

| 话题 | 主题词 | 记录数 | 重点复核数 | 可能串台计数（目标话题:数量） |
|---|---|---:|---:|---|
${rows}

## 重点复核样本（最多 120 条）

| 所属话题 | 席位 | contentId | 标题 | 所属分数 | 其他主题分数 |
|---|---|---|---|---:|---|
${flaggedRows || "| — | — | — | 未发现 | — | — |"}

## 重复来源位置（最多 120 条）

| contentId | 出现位置 |
|---|---|
${duplicateRows || "| — | 未发现 |"}

## 处理建议

1. 先人工阅读重点复核样本的标题和正文，不因关键词交叉自动删除。
2. 运行时优先使用当前主题 + 席位意图检索；模型提示要求过滤旁支背景，原文仅作为依据入口。
3. CLI 返回 AUTH_REQUIRED 前，不能新增实时知乎来源；授权后优先补 T04 三席的“职业倦怠/工作压力/恢复边界”来源，再重跑本报告。
4. 任何替换都保留原文 URL、作者、contentId，并重新生成 embedding。
`;
await writeFile(reportPath, markdown, "utf8");
await writeFile(resolve(root, ".tmp/corpus-cross-talk.json"), JSON.stringify(report, null, 2), "utf8");
console.error(`wrote ${reportPath}`);
