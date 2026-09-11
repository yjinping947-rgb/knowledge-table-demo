# 更新日志

> 本项目的所有重要变更记录。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
> 详细变更报告看 [`docs/change-reports/`](./docs/change-reports/)。

## [Unreleased]

### 计划

- RAG 路径加 fallback 内容（`src/lib/fallback/answer.ts`）
- `/api/answer` 加 Zod 校验（`src/lib/validators/answer.ts`）
- 27 路径测试在 RAG 模式下加 lock 模式（`AI_API_KEY=disabled` 时跑）
- `lint-staged` 启用后跑一遍 lint:fix 看真实提速
- 建 4 个 GitHub team（agent-dev / ui-design / feature-design / corpus）映射到 CODEOWNERS

## [1.3.0] - 2026-09-12

### Skills（4 个核心）

- 加 `.harness/skills/commit-with-rationale.md` — 写变更前预期 → 编码 → 端测 → 写变更后端测效果 → commit
  - 时间戳命名：`docs/change-reports/YYYY-MM-DD-HHMM-<slug>.md`
- 加 `.harness/skills/deploy-app.md` — 4 种模式（dev / local-prod / CI / cloud）+ 健康检查 + 回滚
- 加 `.harness/skills/request-from-teammate.md` — 跨角色协作（扫需求 + 提需求 + 4 角色路由表）
- 加 `.harness/skills/add-corpus.md` — 写 `src/data/topics.json` + 跑 `npm run rag:build` + 验证

### 角色（4 个 human team）

- 加 `.harness/roles/agent-dev.md` — Agent 运行时开发
- 加 `.harness/roles/ui-design.md` — UI 设计
- 加 `.harness/roles/feature-design.md` — 功能设计
- 加 `.harness/roles/corpus.md` — 语料收集

### 文档

- 加 `docs/contributing/skill-reference.md` — 4 skill 总览 + 关系图
- 加 `docs/contributing/cross-role-workflow.md` — 4 角色如何协作 + 典型工作流 + review 矩阵

### Harness 更新

- 改 `.harness/AGENTS.md` — 改第 1 节（项目一句话：RAG 真实内容）+ 加第 6 节"4 核心 skill" + 加第 7 节"5 AI 角色 + 4 Human 角色"
- 改 `.harness/INDEX.md` — 拆第 4 节为 4a（核心 skill）+ 4b（辅助 skill）+ 加第 8 节"4 Human 角色"

### Bug 修复

- 修 `src/lib/rag/index.ts` 导出 topics 模块函数（`loadTopics` / `retrieveFromTopics` 等）
- 补 `src/lib/rag/topics.ts` 实现（之前 b8e564f commit 漏了）
- 修 `package.json` 的 `rag:build` 脚本路径（`modules/corpus/scripts/` → `scripts/`，因为 scripts 没真移到 modules/）
- 修 `.gitignore` 加 `src/data/topic-embeddings.json` + `.tmp/` + `*.log` + `verify-*.txt`

Refs:
- [`b8e564f`](https://github.com/MiniMax/knowledge-table-demo/commit/b8e564f) — refactor(rag): KnowledgeTable 三轮对话用 RAG 库真实回答
- `docs/change-reports/2026-09-12-0400-skills-and-roles.md`（本版本）

## [1.1.1] - 2026-09-12

### 简化

- 改 `.github/CODEOWNERS`：从 5 角色团队（maintainers + director + action + realist + conditional + user = 6 team）简化到 3 团队（maintainers + director-team + seats-team）。3 席位 + 用户域合到 `seats-team`。
- 改 `docs/contributing/team-setup.md`：反映 3 团队结构 + 加"review team vs agent 角色"对照表
- 改 `.harness/INDEX.md` 第 8 节：标注 review team 数 (3) ≠ agent 角色数 (5)

> 运行时 / 契约层（5 角色）不变。变的只是 review 路由 admin 层。

## [1.1.0] - 2026-09-12

### 补齐治理层

- 加 `src/user/` 域：`UserSession` / `Trajectory` 抽象类型 + `selectUserSession` 投影
- 加 `.harness/contracts/answer.md`（`/api/answer` 契约）
- 加 `.harness/rules/branch-policy.md`（分支规范）
- 加 `.harness/skills/write-change-report.md`（变更报告技能）

### 协作治理

- 加 `.github/PULL_REQUEST_TEMPLATE.md`（含变更前预期 / 变更后端测）
- 加 `.github/ISSUE_TEMPLATE/{bug,feature}.md` + `config.yml`
- 加 `.github/CODEOWNERS`（5 角色 reviewer 路由）
- 加 `.github/dependabot.yml`（next/react/zod 分组）
- 加 `.github/workflows/branch-name.yml`（PR 源分支名格式校验）
- 加 `.github/SECURITY.md`（私密安全上报）
- 加 `.github/CODE_OF_CONDUCT.md`（贡献者公约）
- 加 `CONTRIBUTING.md`（指向 `docs/`）

### 文档体系

- 加 `docs/architecture/{overview,agents,harness}.md`
- 加 `docs/development/{setup,branching,workflow}.md`
- 加 `docs/deployment/{local,cloud}.md`
- 加 `docs/change-reports/TEMPLATE.md` + 3 份历史报告
- 加 `docs/contributing/{how-to-pr,how-to-issue,commit-conventions,team-setup}.md`

### 工程化

- 加 `tests/rooms-rag.mjs`（RAG 路径自动化测试）
- 加 `lint-staged`（pre-commit 提速）
- 改 `.harness/hooks/pre-commit.mjs`（用 lint-staged）
- 改 `.github/workflows/ci.yml`（跑 RAG 测试）
- 加 `.nvmrc`（Node 20.9）
- 加 `.editorconfig`（编辑器风格统一）
- 加 `.gitattributes`（行尾与 diff driver）
- 加 `.dockerignore`（未来 Docker 准备）
- 加 `package.json` 脚本：`lint:fix` / `typecheck` / `test:core` / `test:rag` / `test:all`

Refs:
- [2f08f38](https://github.com/MiniMax/knowledge-table-demo/commit/2f08f38) — chore(harness): 补齐治理层 — user 域 + 模板 + 文档体系
- `docs/change-reports/2026-09-12-harness-finalize.md`
- `docs/change-reports/2026-09-12-harness-residual.md`（本版本）

## [1.0.0] - 2026-09-12

### 20 房间 RAG

- 加 `src/data/rooms.json`（20 个房间配置）
- 加 `src/lib/rag/`（cosine similarity 检索 + LLM pipeline）
- 加 `app/api/answer/route.ts`（POST + GET）
- 加 `src/client/rooms/{RoomGrid,RoomDetail,index}.tsx` + `rooms.module.css`
- 加 `src/client/rooms-app/index.tsx`（主页入口）
- 改 `components/KnowledgeTable.tsx`（薄壳 re-export 改指 rooms-app）

Refs:
- [454e787](https://github.com/MiniMax/knowledge-table-demo/commit/454e787) — feat(rooms): 20 个房间 + 房间专属 Agent 人设
- [3efeb6f](https://github.com/MiniMax/knowledge-table-demo/commit/3efeb6f) — feat(rag): 接入本地 RAG 检索 + answer 路由
- [488944d](https://github.com/MiniMax/knowledge-table-demo/commit/488944d) — feat(data+llm): 接真实数据 + LLM 网关
- `docs/change-reports/2026-09-12-rooms.md`

## [0.2.0] - 2026-09-11

### Harness 拆分与治理层

- 加 `.harness/` 治理层（5 角色 / 5 规则 / 3 技能 / 2 契约 / 2 钩子 / 1 评测）
- 拆 `lib/` → `src/{user,data,agents,client,lib}`（5 角色双轨）
- 拆 `components/KnowledgeTable.tsx` 为薄壳 re-export
- 拆前端 `src/client/knowledge-table/`（state + 5 stages + 6 原子组件）
- 加 `commitlint` + `husky` + GitHub Actions
- 加 27 路径核心回归（`tests/core-branches.mjs`）

Refs:
- [30a16a5](https://github.com/MiniMax/knowledge-table-demo/commit/30a16a5) — refactor(harness): 拆分目录与搭建治理层
- `docs/change-reports/2026-09-11-harness-refactor.md`

## [0.1.0] - 2026-09-11

### 初版

- 单体 Next.js demo：围绕"年轻人该不该裸辞"做两轮 AI 结构化讨论
- 3 个观点席位（action / realist / conditional）+ 9 条来源
- AI 导演 + fallback 链路
- 个性化讨论地图（共识 / 真正分歧 / 隐藏前提 / 立场轨迹 / 还没解决）
- 55 个 CSS class（UI 不变性起点）

Refs:
- [e4a50e2](https://github.com/MiniMax/knowledge-table-demo/commit/e4a50e2) — 完成知识拼桌 Demo

---

## 版本号规则

[Semantic Versioning](https://semver.org/lang/zh-CN/)：

- **MAJOR** (x.0.0) — 破坏性变更（API 契约变 / frozen 资源改）
- **MINOR** (0.x.0) — 新功能（加新 agent / 加新 API 端点 / 加新文档体系）
- **PATCH** (0.0.x) — 修 bug / 改文档 / 性能优化

## 变更类型

- `Added` — 新功能
- `Changed` — 已有功能的变更
- `Deprecated` — 即将移除
- `Removed` — 已移除
- `Fixed` — bug fix
- `Security` — 安全相关
- `Docs` — 仅文档
- `Chore` — 依赖 / 工具 / 治理
