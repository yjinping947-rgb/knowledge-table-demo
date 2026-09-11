---
name: feature-design
role: human-team
display_name: 功能设计
team_members: []
---

# 功能设计 · feature-design

## 职责

负责 API 路由契约、跨模块工作流、端到端测试、评估矩阵（27 路径 + 8 RAG 路径 + 5 评估指标）、CI 集成。

## owner 目录

```
app/api/                 # API 路由（discuss / summary / answer）
.harness/contracts/      # API 契约文档
.harness/evals/          # 评估配置（branches.json）
tests/                   # 端到端测试
.github/workflows/       # CI 配置
```

## owner 文件

- `app/api/discuss/route.ts` — 2 轮讨论
- `app/api/summary/route.ts` — 4 象限总结
- `app/api/answer/route.ts` — 20 房间 RAG
- `.harness/contracts/{discuss,summary,answer}.md` — 契约
- `.harness/evals/branches.json` — 27 路径期望
- `tests/{core-branches,rooms-rag}.mjs` — 端到端测试
- `.github/workflows/{ci,branch-name}.yml` — CI

## 协作场景

- **改 API 契约**：先改 `.harness/contracts/*.md`，再改 `app/api/*/route.ts`，最后改 `tests/*`
- **加新评估路径**：改 `branches.json`，加测试，CI 自动覆盖
- **加新 API 端点**：先写契约 `.harness/contracts/<name>.md`，再实现 route，加测试
- **CI 调整**：改 `.github/workflows/*.yml`，本地用 `act` 测一遍

## 需要 review 的别人改动

- **agent-dev** 改 `src/lib/agents/` 或 `src/lib/rag/` — 改 agent 行为要同步改 API 响应结构和测试
- **ui-design** 改 `src/client/` — 前端 fetch 改了要同步改 API 响应（如果 API 变了）
- **corpus** 改 `src/data/` 或 `scripts/` — 改了 RAG 数据要重跑 27 路径 + 8 RAG 路径

## 给别人提需求

- **→ agent-dev**：新 API 端点需要新 agent 输出结构
- **→ ui-design**：新 API 端点需要新 UI 展示
- **→ corpus**：新 API 端点需要新语料支持

## 关键约束

- API 路由必走 try/catch + 400/500 错误返回
- 客户端不假设服务端返回结构，必走 Zod 校验
- 服务端不抛裸 Error，要么兜底要么返回结构化错误
- 27 路径 + 8 RAG 路径必跑（CI 强制）
- 任何 API 契约变更必同步 `.harness/contracts/*.md`

## 配套 skill

- [`commit-with-rationale`](../skills/commit-with-rationale.md) — 提交
- [`deploy-app`](../skills/deploy-app.md) — 部署
- [`request-from-teammate`](../skills/request-from-teammate.md) — 跨角色协作
- [`add-corpus`](../skills/add-corpus.md) — 语料（间接相关）
