# 契约 · discuss

## 路由

`POST /api/discuss`

## 请求

```ts
{
  round: 1 | 2;
  firstChoice: 'support_quit' | 'oppose_quit' | 'depends';
  secondChoice?: 'leave_now' | 'wait_offer' | 'set_deadline' | null;
  respondedSeatIds: ('action' | 'realist' | 'conditional')[];
}
```

校验见 `src/lib/validators/discuss.ts`

## 响应 200（RAG 模式）

```ts
{
  selectedSeatId: 'action' | 'realist' | 'conditional';
  reply: string;            // top-1 知乎回答摘录，约 280 字
  hostComment: string;      // "「{author}」对「{title}」的回答"
  sourceIds: string[];      // 真实知乎 contentId（19 位数字）
  sourceUrls: string[];     // 原文链接，带 utm_medium=openapi_platform
  authors: string[];        // 答主名
  mode: 'ai' | 'fallback';
}
```

## 数据流

```
firstChoice/secondChoice → 映射 seat（action/realist/conditional）
       ↓
embedQuery("年轻人该不该裸辞 {立场} 实际经验")
       ↓
retrieveFromTopics(queryVec, { topicId: "T01", seat }, k=3)
  从 src/data/topic-embeddings.json (33MB, gitignore) 找 cosine top-3
       ↓
top[0].contentText.slice(0, 280)  → reply
top[0].author + top[0].title        → hostComment
top[*]                              → sourceIds / sourceUrls / authors
```

## 响应 400

```ts
{ error: '请求参数不完整' }
```

## 失败兜底

- 缺 `AI_API_KEY` / `AI_BASE_URL` → 调 `getDiscussFallback` 返回 mock 文本（`mode: 'fallback'`）
- embedQuery 失败 → fallback
- retrieveFromTopics 返回空（topic-embeddings.json 不存在 / topicId 不存在）→ fallback
- 关键词兜底：按 authorityLevel + 关键词命中数 + voteUpCount 排序

## 反约束

- 不缓存响应
- 不写数据库
- 不返回密钥痕迹
- `sourceIds` 来自真实知乎 contentId（不再限定在 mock S01-S09 范围）
- reply 是真实知乎内容摘录（不是 LLM 生成）

## 依赖

- `src/data/topics.json` — 1175 条 20 话题 × 3 派真实库
- `src/data/topic-embeddings.json` — 33MB 向量库（gitignore，跑 `npm run rag:build` 生成）
- `src/lib/rag/topics.ts` — cosine 检索 + 关键词回退

## 调用方

- `src/client/knowledge-table/` 的 `chooseFirst` / `chooseSecond`
