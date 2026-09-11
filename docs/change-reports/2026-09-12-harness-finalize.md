# 补齐治理层 — user 域 + GitHub 模板 + 文档体系

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 作者 | @always |
| 关联 commit | （本次） |
| 影响模块 | `.harness/` `.github/` `docs/` `src/user/` `src/client/knowledge-table/state.ts` `README.md` |
| 影响契约 | 无（不改变 API 行为） |

## 背景

2026-09-11 的 `refactor(harness): 拆分目录与搭建治理层`（commit `30a16a5`）搭好了基础，但留了 3 个治理层缺口：

1. **`src/user/` 域空目录** — `.harness/agents/user.md` 声明的 `UserSession` / `Trajectory` 类型在 `src/user/types.ts` 里没实现
2. **GitHub 协作层缺失** — 没有 PR 模板、Issue 模板、CODEOWNERS、Dependabot
3. **工程文档缺失** — 没有 `docs/` 目录，架构 / 部署 / 变更报告 / 贡献指南都散落在 README 或没有

加上最近 4 个 commit 的"快速开发"留下了轻量级治理，本次 PR 一次性补齐。

## 变更前预期

### 用户行为

- 不变 — 这是纯治理层重构，对外行为 0 变化
- 27 路径测试结果与重构前完全一致

### 数据 / API

- API 入参 / 出参不变
- 不动 `app/api/*/route.ts` 和 `src/lib/*` 的运行时
- 新增 `src/user/types.ts` 抽象类型（`UserSession` / `Trajectory`），但**不破坏** `state.ts` 的现有字段

### 兼容性

- `PositionChange` 仍从 `@/lib/types` 导出（向后兼容）
- `src/client/knowledge-table/state.ts` 新增 `selectUserSession` 选择器（新增 API，老调用方式不变）
- `KnowledgeTableState` 字段不变

### Harness 影响

- 治理层从 5 规则 / 3 技能 / 2 契约 扩展到 **6 规则 / 4 技能 / 2 契约 + 1 旁路契约(/api/answer)**
- 协作治理从 0 扩展到 **PR 模板 / Issue 模板 / CODEOWNERS / Dependabot / CI** 五件套
- 文档从 0 扩展到 **5 子目录 13 个文件**（architecture / development / deployment / change-reports / contributing）

## 改了什么

按目录列：

### 新建（src）

- `src/user/types.ts` — `UserSession` / `Trajectory` 抽象类型
- `src/user/index.ts` — 统一出口

### 修改（src）

- `src/client/knowledge-table/state.ts` — 新增 `selectUserSession` 选择器（投影到 `UserSession`）

### 新建（.harness/）

- `.harness/rules/branch-policy.md` — 分支规范（与 commit-policy 同构）
- `.harness/skills/write-change-report.md` — 写变更报告的技能

### 修改（.harness/）

- `.harness/AGENTS.md` — 加 docs/ 引用、加分支规则、加协作治理 8
- `.harness/INDEX.md` — 加分支规则、加写变更报告技能、加 8/9 节（协作治理 + 文档）
- `.harness/agents/user.md` — 加 `selectUserSession` 投影说明、加类型所在位置

### 新建（.github/）

- `.github/PULL_REQUEST_TEMPLATE.md` — PR 必带"变更前预期"和"变更后端测效果"
- `.github/ISSUE_TEMPLATE/config.yml` — issue chooser
- `.github/ISSUE_TEMPLATE/bug.md` — bug 报告模板
- `.github/ISSUE_TEMPLATE/feature.md` — feature 请求模板
- `.github/CODEOWNERS` — 5 角色 reviewer 自动路由
- `.github/dependabot.yml` — next/react/zod 分组 + 周一 9 点开 PR

### 新建（docs/）

- `docs/README.md` — 文档总目录
- `docs/architecture/overview.md` — 架构概览
- `docs/architecture/agents.md` — 5 角色系统详解
- `docs/architecture/harness.md` — 治理层详解
- `docs/development/setup.md` — 本地开发环境搭建
- `docs/development/branching.md` — 分支规范（开发者版）
- `docs/development/workflow.md` — 改代码的标准流程
- `docs/deployment/local.md` — 本地部署
- `docs/deployment/cloud.md` — 云端部署（占位）
- `docs/change-reports/TEMPLATE.md` — 变更报告模板
- `docs/change-reports/2026-09-11-harness-refactor.md` — 追溯性报告
- `docs/change-reports/2026-09-12-rooms.md` — 追溯性报告
- `docs/contributing/how-to-pr.md` — 怎么提 PR
- `docs/contributing/how-to-issue.md` — 怎么提 issue
- `docs/contributing/commit-conventions.md` — commit 规范

### 新建（根）

- `.nvmrc` — Node 20.9.0
- `.editorconfig` — 编辑器风格统一
- `.gitattributes` — git 行尾与 diff driver

### 修改（根）

- `README.md` — 指向 `docs/`，新增协作治理小节

## 变更后端测效果

### 自动化测试

- `npm run lint`：0 warning（通过）
- `npm run build`：Compiled successfully in 363ms，TypeScript 2.1s（通过）
- `node tests/core-branches.mjs`：**PASS: 3 first-round branches, 9 combined branches, 27 summaries, source constraints, length limits, invalid input**

### 手动验证

- typecheck 通过（build 阶段跑了 TypeScript 2.1s）
- lint 通过（0 warning）
- 27 路径全部 200 + sourceIds 全部落在绑定列表内 + 长度边界未超 + summary 字段非空 + 非法输入 400
- AI 模式与 fallback 模式都验证（API key 配置在 `.env.local`）
- 第一次 API 调用 2.4s，27 路径全跑约 100s

### 边界 / 异常

- `selectUserSession` 投影类型严格：`firstChoice` / `secondChoice` / `positionChange` 全部 nullable
- `respondedSeatIds` 从 `responses.map(r => r.selectedSeatId)` 派生而非独立存储（避免重复事实源）
- 跨平台：所有钩子是 `.mjs` 不是 `.sh`，Windows / macOS / Linux 都能跑
- 不动 frozen 资源（`app/globals.css` / `app/layout.tsx` / `app/page.tsx` / `public/assets/`）

## 风险 / 回滚

- **风险点**：CODEOWNERS 里的 team handle（`@MiniMax/director-team` 等）是占位，组织里没建 — PR review 时不会自动加对应 reviewer，会用默认兜底 `@MiniMax/maintainers`
- **风险点**：Dependabot 启用后每周一 9 点会开 PR，需要有人 review
- **风险点**：docs/ 写了很多内容但没人 review 准确性，可能有事实偏差（特别是 `change-reports/2026-09-11-harness-refactor.md` 是追溯性写的）
- **回滚方式**：`git revert <commit-hash>` — 治理层不影响运行时，回滚后应用功能完全不变
- **回滚后状态**：恢复 2026-09-12 之前的"基础治理层 + 快速开发"状态

## 后续 TODO

- [ ] 在 GitHub 组织里建好 5 个 team（`@MiniMax/{director,action,realist,conditional,user}-team`），把 CODEOWNERS 的占位 handle 替换成真实 team
- [ ] `/api/answer` 加 harness 契约（现在只有 docs/change-reports/2026-09-12-rooms.md 描述）
- [ ] `tests/rooms-rag.mjs` 加 RAG 路径自动化测试（27 路径不覆盖 /api/answer）
- [ ] 后续重大变更按 `.harness/skills/write-change-report.md` 写 change report
- [ ] 后续 PR 按 `.github/PULL_REQUEST_TEMPLATE.md` 写"变更前预期"和"变更后端测效果"
- [ ] 后续 issue 按 `.github/ISSUE_TEMPLATE/{bug,feature}.md` 提

## 事后回顾（预留）

待 PR review / 合并后补。
