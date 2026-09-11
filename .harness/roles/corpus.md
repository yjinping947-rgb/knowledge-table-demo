---
name: corpus
role: human-team
display_name: 语料收集
team_members: []
---

# 语料收集 · corpus

## 职责

负责知乎问答语料的采集、清洗、分类、embedding 生成。20 话题 × 3 派 = 1175 条真实回答（unique contentId 743 个）。

## owner 目录

```
src/data/                # JSON 数据（topic.json / topics.json / seats.json / sources.json / rooms.json / rag-corpus.json）
scripts/                 # 采集 / embedding 脚本
```

## owner 文件

- `src/data/topics.json` — 1175 条 20 话题 × 3 派结构化语料
- `src/data/topic.json` — 1 个总话题
- `src/data/seats.json` — 3 个席位定义
- `src/data/sources.json` — 9 条原始来源（S01-S09）
- `src/data/rooms.json` — 20 个房间配置
- `src/data/rag-corpus.json` — 28 条 RAG 旧语料
- `src/data/rag-embeddings.json` — 旧 embeddings（gitignore）
- `src/data/topic-embeddings.json` — 新 embeddings（gitignore）
- `scripts/collect-corpus-batch.mjs` — 采集 + 校验
- `scripts/embed-topics.mjs` — 生成 embedding
- `scripts/build-rooms.mjs` — 从 corpus 生成 rooms.json

## 协作场景

- **加新话题**：写进 `topics.json`，跑 `npm run rag:build`
- **现有话题补数据**：同样写进 `topics.json`，跑 `npm run rag:build`
- **改 embedding 模型**：改 `embed-topics.mjs` 的 `model` 常量 + `embedQuery` 调用

## 需要 review 的别人改动

- **agent-dev** 改 `src/lib/rag/retrieve.ts` 或 `src/lib/rag/topics.ts` — 改了检索逻辑要通知 corpus 重测
- **feature-design** 改 `app/api/answer/route.ts` — API 响应结构变了要通知 corpus 验证语料覆盖

## 给别人提需求

- **→ agent-dev**：需要新维度的检索（如按时间、按作者过滤）
- **→ feature-design**：新 API 端点需要新语料
- **→ ui-design**：新语料展示样式需求

## 数据 schema 约束

`topics.json` 每条：

```json
{
  "contentId": "<unique-id-from-zhihu>",
  "title": "完整标题",
  "author": "答主名",
  "contentText": "完整原文（不截断）",
  "url": "https://www.zhihu.com/question/.../answer/...<b>utm=openai_platform</b>",
  "voteUpCount": <int>,
  "commentCount": <int>,
  "authorityLevel": "<string>"
}
```

- `contentId` 全局唯一（用知乎 API 的 `id` 字段）
- `url` 必带 `utm=openai_platform`（防爬虫）
- `contentText` 完整原文（用于 LLM 参考来源）

`topics.json` 顶层结构：

```json
{
  "T01": {
    "id": "T01",
    "title": "裸辞",
    "seats": {
      "action": [...],         // ~20 条
      "realist": [...],        // ~20 条
      "conditional": [...]     // ~20 条
    }
  }
}
```

## 性能 / 成本

| 操作 | 时间 | 费用（text-embedding-3-small） |
|---|---|---|
| 20 条 embedding | ~30s | $0.0003 |
| 60 条（1 话题） | ~90s | $0.0009 |
| 1200 条（重建） | ~30 min | $0.018 |

## 配套 skill

- [`add-corpus`](../skills/add-corpus.md) — **核心 skill**
- [`commit-with-rationale`](../skills/commit-with-rationale.md) — 提交
- [`request-from-teammate`](../skills/request-from-teammate.md) — 跨角色协作
