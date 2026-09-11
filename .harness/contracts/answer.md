# 契约 · answer

## 路由

`POST /api/answer` — 房间内 RAG 问答
`GET  /api/answer` — 列出所有房间
`GET  /api/answer?roomId=<id>` — 查单个房间

## POST /api/answer 请求

```ts
{
  question: string;       // 必填，用户问题
  k?: number;             // 检索 topK，默认 4
  roomId?: string;        // 房间 id（如提供，强制 top[0] = 该答主语料）
}
```

校验见 `src/lib/validators/answer.ts`（**P2 待建**）

## POST /api/answer 响应 200

```ts
{
  answer: string;         // LLM 生成的回答，引用语料细节
  reasoningContent: string; // 模型的推理过程（部分模型支持，如 qwen3-vl-flash）
  retrieved: Array<{
    contentId: string;    // 语料 id（与 src/data/rag-corpus.json 对应）
    title: string;
    author: string;
    contentText: string;  // 语料全文（首条会全文给，后续会截断）
    url: string;
    voteUpCount: number;
    commentCount: number;
    authorityLevel?: string; // 答主权重（部分语料有）
    score: number;        // cosine similarity, [0, 1]
  }>;
  mode: 'ai' | 'fallback';
}
```

**注意**：实现层用 `contentId` 而非 `id`（与 `src/lib/rag/retrieve.ts` 的 `RagItem` 类型一致）。
如需在 API 层做改名（`contentId` → `id`），是破坏性变更，需走 MAJOR 版本升级 + deprecation 流程。

## GET /api/answer 响应 200

```ts
{
  rooms: Array<Room>;
}
```

`Room` 类型见 `src/lib/rag/types.ts`（**P2 待建**）：

```ts
type Room = {
  id: string;
  title: string;
  author: string;
  excerpt: string;
  sourceUrl: string;
  corpusId: string;
  voteUpCount: number;
  commentCount: number;
};
```

## GET /api/answer?roomId=<id> 响应 200

```ts
Room;
```

## 响应 4xx

| 状态 | 场景 | 返回 |
|---|---|---|
| 400 | 缺 `question` 或类型不对 | `{ error: "缺少 question 字段" }` |
| 404 | roomId 不存在 | `{ error: "房间 <id> 不存在" }` |

## 失败兜底

- 缺 `AI_API_KEY` → 走 `getAnswerFallback(question)` 返回拼 corpus 的演示回答，`mode: "fallback"`
- 模型超时 / 解析失败 / 校验失败 → 同样走 fallback
- `process.env.NODE_ENV === 'development'` 时 `console.error` 一次

## 反约束

- 不缓存响应
- 不写数据库
- 不返回密钥痕迹
- RAG embedding 与 LLM 必须用同一个 `AI_BASE_URL`（保持一致）
- `roomId` 提供时，必须把 `corpusId === room.corpusId` 的语料强制放到 retrieved[0]（保证人设）
- `answer` 不能编造引用，必须只引用 retrieved 列表中的语料

## 调用方

- `src/client/rooms/RoomDetail.tsx` 的 `onSend(question)`
- `src/client/rooms-app/index.tsx` 的 `fetch("/api/answer")`

## 数据来源

- 语料：`src/data/rag-corpus.json`（28 条知乎问答）
- Embedding：`src/data/rag-embeddings.json`（28 × 1536 维，text-embedding-3-small）
- 房间配置：`src/data/rooms.json`（20 个房间，由 `scripts/build-rooms.mjs` 从 corpus 前 20 条生成）

## 实现位置

- 路由：`app/api/answer/route.ts`
- Pipeline：`src/lib/rag/pipeline.ts`（`runRag(question, k, roomId)`）
- 检索：`src/lib/rag/retrieve.ts`（cosine similarity top-K）
- Embedding 客户端：`src/lib/rag/client.ts`
- Fallback：**P2 待建** `src/lib/fallback/answer.ts`
