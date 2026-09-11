// .tmp/embed-corpus.mjs
// 把 .tmp/corpus.json 移到 src/data/rag-corpus.json，然后向量化。
// embedding 模型：text-embedding-3-small（OpenAI Next Credits 兼容）。

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "knowledge-table-demo");

// 1. 读 .tmp/corpus.json
const corpusPath = resolve(__dirname, "corpus.json");
const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
console.log(`corpus: ${corpus.length} items`);

// 2. 写一份到 src/data/rag-corpus.json（项目内）
const destPath = resolve(projectRoot, "src/data/rag-corpus.json");
await writeFile(destPath, JSON.stringify(corpus, null, 2), "utf8");
console.log(`wrote ${destPath}`);

// 3. 准备 embedding 调用
const baseUrl = process.env.AI_BASE_URL || "https://api.openai-next.com/v1";
const apiKey = process.env.AI_API_KEY;
if (!apiKey) {
  console.error("AI_API_KEY not in env. Run with: $env:AI_API_KEY='sk-...'; node embed-corpus.mjs");
  process.exit(1);
}

const model = "text-embedding-3-small";
const url = `${baseUrl}/embeddings`;

// 4. 批量调 embedding
const BATCH = 10;
const allEmbeddings = [];
for (let i = 0; i < corpus.length; i += BATCH) {
  const batch = corpus.slice(i, i + BATCH);
  const inputs = batch.map((it) => (it.title + "\n" + (it.contentText || "")).slice(0, 8000));
  const body = JSON.stringify({ model, input: inputs });
  const t0 = Date.now();
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });
  const dt = Date.now() - t0;
  if (!r.ok) {
    console.error(`batch ${i} failed: HTTP ${r.status}`);
    console.error(await r.text());
    process.exit(1);
  }
  const j = await r.json();
  for (let k = 0; k < j.data.length; k++) {
    allEmbeddings.push({
      contentId: batch[k].contentId,
      title: batch[k].title,
      author: batch[k].author,
      embedding: j.data[k].embedding,
    });
  }
  console.log(`batch ${i}-${i + batch.length} [${dt}ms]: ${j.usage?.total_tokens ?? "?"} tokens`);
}

// 5. 写 embeddings
const embPath = resolve(projectRoot, "src/data/rag-embeddings.json");
await writeFile(embPath, JSON.stringify(allEmbeddings, null, 0), "utf8");
console.log(`wrote ${embPath} (${allEmbeddings.length} embeddings, dim=${allEmbeddings[0].embedding.length})`);
