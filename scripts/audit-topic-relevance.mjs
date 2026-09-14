// 只读检查 T01–T20 三席来源是否真正提到当前话题关键词。
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const topics = JSON.parse(await readFile(resolve(process.cwd(), "src/data/topics.json"), "utf8"));
const stop = new Set(["什么", "如何", "怎么", "可以", "应该", "到底", "现在", "真的", "问题", "工作"]);
const report = [];
for (const [id, topic] of Object.entries(topics)) {
  if (!/^T(?:0[1-9]|1[0-9]|20)$/.test(id)) continue;
  const rawTerms = topic.title.match(/[\u4e00-\u9fff]{2,}|[a-zA-Z0-9]{2,}/g) ?? [];
  const terms = Array.from(new Set(rawTerms.flatMap((part) => {
    if (/^[\u4e00-\u9fff]+$/.test(part) && part.length > 2) {
      return Array.from({ length: part.length - 1 }, (_, index) => part.slice(index, index + 2));
    }
    return [part];
  }).filter((x) => !stop.has(x))));
  const seats = {};
  for (const seat of ["action", "realist", "conditional"]) {
    const entries = topic.seats[seat] ?? [];
    const matched = entries.filter((source) => terms.some((term) => `${source.title} ${source.contentText}`.toLowerCase().includes(term.toLowerCase()))).length;
    seats[seat] = { total: entries.length, matched, rate: entries.length ? Number((matched / entries.length).toFixed(3)) : 0 };
  }
  report.push({ id, title: topic.title, terms, seats });
}
console.log(JSON.stringify({ topicCount: report.length, topics: report }, null, 2));
const weak = report.filter((item) => Object.values(item.seats).some((seat) => seat.rate < 0.5));
if (weak.length) console.error(`RELEVANCE_REVIEW: ${weak.map((item) => `${item.id}/${item.title}`).join(", ")}`);
else console.error("RELEVANCE_PASS: all T01–T20 seats have >=50% keyword-linked records");
