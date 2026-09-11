# 贡献指南

> 欢迎贡献！本项目以"按规范做事"为核心，**所有贡献者（包括 AI agent）按相同规范**。
> 详细规则看 [`docs/`](./docs/)。

## 一图速览

```
改代码
  → 读 .harness/AGENTS.md（必读）
  → 拉分支：<type>/<scope>-<short-desc>
  → 写代码
  → 写"变更前预期"
  → 跑 npm run lint
  → 跑 node tests/core-branches.mjs（如改 discuss/summary）
  → 跑 node tests/rooms-rag.mjs（如改 RAG）
  → 写"变更后端测效果"
  → commit（type(scope): subject ≤ 30 字）
  → push + 提 PR
  → 等 review + CI
  → 合并后分支自动删除
```

## 详细文档

| 想做 | 看 |
|---|---|
| 第一次参与 | [`docs/development/setup.md`](./docs/development/setup.md) |
| 拉分支 | [`docs/development/branching.md`](./docs/development/branching.md) + [`.harness/rules/branch-policy.md`](./.harness/rules/branch-policy.md) |
| 改代码的标准流程 | [`docs/development/workflow.md`](./docs/development/workflow.md) |
| 怎么提 PR | [`docs/contributing/how-to-pr.md`](./docs/contributing/how-to-pr.md) + [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md) |
| 怎么提 issue | [`docs/contributing/how-to-issue.md`](./docs/contributing/how-to-issue.md) + [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/) |
| commit message 规范 | [`docs/contributing/commit-conventions.md`](./docs/contributing/commit-conventions.md) + [`.harness/rules/commit-policy.md`](./.harness/rules/commit-policy.md) |
| 写变更报告 | [`docs/change-reports/TEMPLATE.md`](./docs/change-reports/TEMPLATE.md) + [`.harness/skills/write-change-report.md`](./.harness/skills/write-change-report.md) |
| 理解架构 | [`docs/architecture/overview.md`](./docs/architecture/overview.md) |
| 部署 | [`docs/deployment/local.md`](./docs/deployment/local.md) / [`docs/deployment/cloud.md`](./docs/deployment/cloud.md) |
| 了解 5 角色 | [`docs/architecture/agents.md`](./docs/architecture/agents.md) + [`.harness/agents/`](./.harness/agents/) |
| 了解治理层 | [`docs/architecture/harness.md`](./docs/architecture/harness.md) |

## 核心规则

### 1. 同一规范

任何人（包括 AI agent）改代码，都必须：

- 分支名符合 `<type>/<scope>-<short-desc>` 格式（CI 自动校验）
- commit message 符合 conventional commits（commitlint 校验）
- PR 必带"变更前预期"和"变更后端测效果"
- 重大变更写 `docs/change-reports/YYYY-MM-DD-<slug>.md`

### 2. 改 `.harness/` 前必读

`.harness/INDEX.md` 是单一事实源。改任何 `.harness/` 下文件前先看那里。

### 3. 不动 frozen 资源

以下资源**冻结**，必须先在 PR 描述里 justify 并 `@maintainers` 才可改：

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `public/assets/`
- 55 个 CSS class（见 `.harness/rules/ui-invariance.md`）
- 8 个 stage（见 `.harness/rules/ui-invariance.md`）

### 4. AI key 隐私

`AI_API_KEY` / `AI_BASE_URL` **只在服务端**使用。客户端代码**禁止**引用。

### 5. 缺 key 不抛错

任何 AI 调用路径必须提供 fallback（`src/lib/fallback/`），缺 key / 解析失败 / 校验失败 / 越界时自动走 fallback。

## 报告 bug / 请求功能

按对应 issue 模板（`.github/ISSUE_TEMPLATE/{bug,feature}.md`）写。

## 安全漏洞

**不要**在公开 issue 里发安全漏洞！按 [`.github/SECURITY.md`](./.github/SECURITY.md) 私密上报。

## 行为准则

所有贡献者遵守 [`.github/CODE_OF_CONDUCT.md`](./.github/CODE_OF_CONDUCT.md)。

## 许可

（待补 — 当前是 demo 内部使用）
