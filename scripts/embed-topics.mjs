// scripts/embed-topics.mjs
// 读 src/data/topics.json → 展平为带 (topic, seat) 标签的语料 → 调 embedding API → 存到 src/data/topic-embeddings.json

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const baseUrl = process.env.AI_BASE_URL;
const apiKey = process.env.AI_API_KEY;
if (!apiKey || !baseUrl) {
  console.error("need AI_API_KEY and AI_BASE_URL in env");
  process.exit(1);
}

const model = "text-embedding-3-small";
const url = `${baseUrl}/embeddings`;
const BATCH = 10;

// 读 topics.json，展平为 items
const topics = JSON.parse(await readFile(resolve(projectRoot, "src/data/topics.json"), "utf8"));

const items = [];
for (const topicId of Object.keys(topics)) {
  const t = topics[topicId];
  for (const seat of ["action", "realist", "conditional"]) {
    for (const src of t.seats[seat]) {
      items.push({
        contentId: src.contentId,
        topicId,
        seat,
        title: src.title,
        author: src.author,
        contentText: src.contentText,
      });
    }
  }
}
console.log(`flattened ${items.length} items`);

// 批量 embed
const allEmbeddings = [];
let batchCount = 0;
const t0 = Date.now();
for (let i = 0; i < items.length; i += BATCH) {
  batchCount++;
  const batch = items.slice(i, i + BATCH);
  const inputs = batch.map((it) => (it.title + "\n" + (it.contentText || "")).slice(0, 8000));
  const tStart = Date.now();
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: inputs }),
  });
  const dt = Date.now() - tStart;
  if (!r.ok) {
    console.error(`batch ${batchCount} failed: HTTP ${r.status}`);
    console.error(await r.text());
    process.exit(1);
  }
  const j = await r.json();
  for (let k = 0; k < j.data.length; k++) {
    allEmbeddings.push({
      contentId: batch[k].contentId,
      topicId: batch[k].topicId,
      seat: batch[k].seat,
      title: batch[k].title,
      author: batch[k].author,
      embedding: j.data[k].embedding,
    });
  }
  if (batchCount % 10 === 0 || batchCount === 1) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`batch ${batchCount}/${Math.ceil(items.length / BATCH)} [${dt}ms, total ${elapsed}s] tokens=${j.usage?.total_tokens ?? "?"}`);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n=== done in ${elapsed}s ===`);

const outPath = resolve(projectRoot, "src/data/topic-embeddings.json");
await writeFile(outPath, JSON.stringify(allEmbeddings), "utf8");

const stat = await import("node:fs").then((m) => m.promises.stat(outPath));
console.log(`wrote ${outPath}`);
console.log(`  ${allEmbeddings.length} embeddings, ${(stat.size / 1024 / 1024).toFixed(2)} MB, dim=${allEmbeddings[0].embedding.length}`);
