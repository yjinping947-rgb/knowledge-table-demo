---
name: agent-dev
role: human-team
display_name: Agent 运行时开发
team_members: []
---

# Agent 运行时开发 · agent-dev

## 职责

负责 5 角色 AI agent 的运行时实现、提示词、RAG 检索、fallback 内容、Zod 校验、跨模块类型。

## owner 目录

```
src/lib/ai/              # AI 客户端（OpenAI 兼容）
src/lib/rag/             # RAG pipeline + topics.json 语料检索
src/lib/fallback/        # 27 路径兜底内容
src/lib/prompts/         # 提示词模板（含 seats/）
src/lib/validators/      # Zod 校验
src/lib/types.ts         # 跨模块类型
```

## owner 文件

- `src/agents/{director,action,realist,conditional}/` — 5 角色运行时
- `src/user/` — user 域抽象
- `.harness/agents/*.md` — 5 角色契约（与 runtime 同步更新）
- `src/data/topic-embeddings.json` — 由当前 topics.json 生成的 1536 维向量（生成与维护）

## 协作场景

- **改 agent 立场 / prompt**：改 `.harness/agents/<role>.md` + `src/lib/prompts/seats/<role>.ts`，跑 `npm run test:core` 验证
- **改 fallback 内容**：改 `src/lib/fallback/`，确保 27 路径 fallback 模式全有内容
- **改 RAG 检索逻辑**：改 `src/lib/rag/`，跑 `npm run test:rag` 验证 8 路径
- **加新角色**：5 个步骤（详见 `.harness/skills/add-corpus.md` 的 Q&A 段落）

## 需要 review 的别人改动

- **ui-design** 改 `src/client/` — 不直接影响 agent 运行时，但 stage 改了可能要调 director 路由
- **feature-design** 改 API 路由（`app/api/*`）— API 契约变了，agent 输出结构可能要跟着调
- **corpus** 加新语料 — 不影响 agent 运行时，但 RAG 检索结果变了要重跑 27 路径

## 给别人提需求

- **→ ui-design**：需要新的 stage / component 来展示 agent 状态
- **→ feature-design**：agent 行为变了需要改 API 契约或加测试
- **→ corpus**：需要新领域的语料来支持新立场

## 关键约束

- 5 角色立场不能混（action/realist/conditional 各有明确立场）
- 改 prompt 后必跑 27 路径（AI 模式 + fallback 模式都验）
- 改 RAG 后必跑 8 RAG 路径
- 任何 agent 输出都过 Zod 校验（不允许 sourceIds 越界）

## 配套 skill

- [`commit-with-rationale`](../skills/commit-with-rationale.md) — 提交
- [`add-corpus`](../skills/add-corpus.md) — 语料（间接相关）
- [`request-from-teammate`](../skills/request-from-teammate.md) — 跨角色协作
