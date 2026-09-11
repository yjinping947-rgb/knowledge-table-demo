// scripts/build-rooms.mjs
// 从 src/data/rag-corpus.json 选 20 条，生成 src/data/rooms.json。
// 房间 id r01..r20，title 去" - 知乎"后缀，excerpt 取前 300 字。

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const corpus = JSON.parse(
  await readFile(resolve(projectRoot, "src/data/rag-corpus.json"), "utf8"),
);

const rooms = corpus.slice(0, 20).map((c, i) => ({
  id: `r${String(i + 1).padStart(2, "0")}`,
  title: c.title.replace(/\s*-\s*知乎\s*$/, "").trim(),
  author: c.author,
  excerpt: c.contentText.slice(0, 300),
  sourceUrl: c.url,
  corpusId: c.contentId,
  voteUpCount: c.voteUpCount,
  commentCount: c.commentCount,
}));

const outPath = resolve(projectRoot, "src/data/rooms.json");
await writeFile(outPath, JSON.stringify(rooms, null, 2), "utf8");
console.log(`wrote ${rooms.length} rooms to ${outPath}`);
for (const r of rooms) {
  console.log(`  ${r.id}  ${r.author}  ${r.title}`);
}
