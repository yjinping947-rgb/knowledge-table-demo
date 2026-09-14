# 契约 · summary

## 路由

`POST /api/summary`

## 请求

```ts
{
  firstChoice: 'support_quit' | 'oppose_quit' | 'depends';
  secondChoice: 'leave_now' | 'wait_offer' | 'set_deadline';
  positionChange: 'unchanged' | 'slightly_changed' | 'changed';
  respondedSeatIds: ('action' | 'realist' | 'conditional')[];
}
```

校验见 `src/lib/validators/summary.ts`

## 响应 200（RAG 模式）

```ts
{
  consensus: string;              // 取 conditional seat top-1
  disagreement: string;           // 取 realist seat top-1
  hiddenAssumption: string;       // 取 action seat top-1
  trajectory: {
    before: string;               // 用户讨论前倾向
    during: string;               // 在具体情境下选择
    after: string;                 // 反思后立场
  };
  openQuestion: string;            // 取 conditional seat top-1（开放式问题）
  sourceIds: string[];            // 4 条来源的 contentId
  sourceUrls: string[];           // 4 条原文链接
  authors: string[];              // 4 位答主
  mode: 'generated' | 'retrieval' | 'fallback';  // PRD 10.2 三值；旧值 'ai' 已废弃
}
```

## 数据流

```
query = "年轻人该不该裸辞 {firstChoice} {secondChoice} 之后 {positionChange}"
       ↓
embedQuery(query)
       ↓
4 路并行 retrieveFromTopics(queryVec, { topicId: "T01", seat: S }, 1)
  S ∈ {conditional, realist, action, conditional}
       ↓
每个字段取对应 seat 的 top-1
```

## 失败兜底

- 缺 `AI_API_KEY` / `AI_BASE_URL` → 调 `getSummaryFallback` 返回 mock
- embedQuery 失败 → fallback
- 部分 seat 缺数据 → 自动退到下一有数据的 seat

## 反约束

- 4 字段都从 RAG 库真实内容填（不是 LLM 生成）
- trajectory 三段是固定模板（前/中/后）
- `sourceIds` / `sourceUrls` / `authors` 数组长度等于实际找到的 source 数（可能少于 4）

## 依赖

- 与 discuss 相同（`src/data/topics.json` + `topic-embeddings.json` + `src/lib/rag/topics.ts`）
