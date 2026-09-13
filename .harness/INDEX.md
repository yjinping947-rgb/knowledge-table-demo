# INDEX.md · 单一事实源

> 改 `.harness/` 下任何文件前，先看这里。

机器可读的结构与命令真源是 [`.harness/repo-manifest.json`](./repo-manifest.json)；文档入口见 [`../docs/harness/README.md`](../docs/harness/README.md)。

## 1. 模块 → owner

| 路径 | 责任 agent | 备注 |
|---|---|---|
| `app/` | director | 仅改 import，逻辑下移到 src/ |
| `src/user/` | user | 用户域（UserSession / Trajectory） |
| `src/data/` | director | 数据索引（类型化导出） |
| `src/agents/director/` | director | 讨论路由 |
| `src/agents/action/` | action | 行动派 |
| `src/agents/realist/` | realist | 现实派 |
| `src/agents/conditional/` | conditional | 条件派 |
| `src/client/knowledge-table/` | director | 前端（拆 stage + 原子组件） |
| `src/client/rooms/` + `src/client/rooms-app/` | director | 20 房间 demo |
| `src/lib/ai/` | director | AI 客户端 |
| `src/lib/prompts/` | director | 提示词模板 |
| `src/lib/prompts/seats/` | 对应 seat | 席位专属 prompt |
| `src/lib/validators/` | director | Zod 校验 |
| `src/lib/fallback/` | director | 兜底内容 |
| `src/lib/rag/` | director | RAG pipeline（20 房间用） |
| `src/lib/types.ts` | director | 跨模块类型 |
| `components/KnowledgeTable.tsx` | director | 薄壳 re-export |
| `tests/` | director | 核心回归 |
| `docs/` | director | 工程文档（architecture/development/deployment/change-reports/contributing） |
| `public/assets/` | （冻结） | 不动 |
| `app/globals.css` | （冻结） | 不动 |
| `app/layout.tsx` | （冻结） | 不动 |
| `app/page.tsx` | （冻结） | 不动 |

## 2. .harness/agents/ → src/agents/ 映射

| 契约层（harness） | 运行时层（src） |
|---|---|
| [`.harness/agents/director.md`](./agents/director.md) | `src/agents/director/` |
| [`.harness/agents/action.md`](./agents/action.md) | `src/agents/action/` |
| [`.harness/agents/realist.md`](./agents/realist.md) | `src/agents/realist/` |
| [`.harness/agents/conditional.md`](./agents/conditional.md) | `src/agents/conditional/` |
| [`.harness/agents/user.md`](./agents/user.md) | `src/user/` |

## 3. 规则 → 触发场景

- [`rules/ui-invariance.md`](./rules/ui-invariance.md) — 改 `src/client/` 或 `components/` 时必读
- [`rules/coding-standards.md`](./rules/coding-standards.md) — 任何代码改动
- [`rules/fallback-policy.md`](./rules/fallback-policy.md) — 改 `src/lib/fallback/` 或 `src/lib/prompts/` 时
- [`rules/privacy.md`](./rules/privacy.md) — 改 `src/lib/ai/` 或 API 路由时
- [`rules/commit-policy.md`](./rules/commit-policy.md) — 任何 commit 前
- [`rules/branch-policy.md`](./rules/branch-policy.md) — 拉分支时

## 4. 技能 → 触发场景

### 4a. 4 核心 skill（开发协作）

- [`skills/commit-with-rationale.md`](./skills/commit-with-rationale.md) — **每次 commit 前**：写时间戳命名的 change report → 编码 → 端测 → commit
- [`skills/deploy-app.md`](./skills/deploy-app.md) — **部署时**：本地生产 / CI / 云端三种模式 + 健康检查 + 回滚
- [`skills/request-from-teammate.md`](./skills/request-from-teammate.md) — **跨角色协作**：扫别人需求 + 提需求给对应角色
- [`skills/add-corpus.md`](./skills/add-corpus.md) — **加新语料**：校验 `src/data/topics.json` + 增量生成 embedding；覆盖式采集才跑 `npm run rag:build`

四个核心 skill 都要求留下共享证据：提交报告写入 `docs/change-reports/`，跨角色需求写入 `docs/requests/`，部署记录写入 `docs/deployment/records/`。这些目录是 `gh` 不可用时的本地协作 fallback。

### 4b. 4 辅助 skill（领域知识）

- [`skills/write-seat-reply.md`](./skills/write-seat-reply.md) — 为某个席位写 reply 时
- [`skills/generate-summary-map.md`](./skills/generate-summary-map.md) — 生成 summary 的四个象限时
- [`skills/author-fallback.md`](./skills/author-fallback.md) — 写兜底内容时
- [`skills/write-change-report.md`](./skills/write-change-report.md) — 写变更报告时

详见 [`../docs/contributing/skill-reference.md`](../docs/contributing/skill-reference.md) 总览。

## 5. 契约 → API 路由

- [`contracts/discuss.md`](./contracts/discuss.md) — `app/api/discuss/route.ts`
- [`contracts/summary.md`](./contracts/summary.md) — `app/api/summary/route.ts`
- [`contracts/answer.md`](./contracts/answer.md) — `app/api/answer/route.ts`（RAG 房间问答）

## 6. Harness 验证

- `npm run harness:check` — 检查 manifest 中的必需入口、skill 文件、相对链接和 package scripts。
- `.harness/hooks/pre-commit.mjs` — 在 lint-staged 和测试前执行轻量 harness 检查。
- 任何治理层入口漂移都应先修 manifest / INDEX，再修改业务文件。

## 7. 钩子 → git 阶段

- `hooks/pre-commit.mjs` — pre-commit 阶段跑 lint-staged + test
- `hooks/commit-msg.mjs` — commit-msg 阶段跑 commitlint

## 8. 评测 → 路径

- `evals/branches.json` — 27 路径期望输出（与 `tests/core-branches.mjs` 对齐）
- `tests/rooms-rag.mjs` — RAG 路径自动化（与 `contracts/answer.md` 对齐）

## 9. 4 Human 角色（开发职责）

> 跟 `.harness/agents/` 的 5 AI 角色是不同层。AI 角色是运行时契约，Human 角色是开发职责。

| Human 角色 | owner 目录 | 关键 skill | 必读 |
|---|---|---|---|
| **agent-dev** | `src/agents/` + `src/user/` + `src/lib/{ai,rag,prompts,fallback,validators,types.ts}` + `app/api/` + `.harness/agents/` | commit-with-rationale | [`roles/agent-dev.md`](./roles/agent-dev.md) |
| **ui-design** | `src/client/` + `components/` + 4 个 frozen 资源 | commit-with-rationale | [`roles/ui-design.md`](./roles/ui-design.md) |
| **feature-design** | `app/api/` + `.harness/contracts/` + `.harness/evals/` + `tests/` + `.github/workflows/` | commit-with-rationale + deploy-app | [`roles/feature-design.md`](./roles/feature-design.md) |
| **corpus** | `src/data/` + `scripts/` | add-corpus + commit-with-rationale | [`roles/corpus.md`](./roles/corpus.md) |

**对应 GitHub Team**（用 `node scripts/setup-teams.mjs create` 一键建）：

- `agent-dev` → `@MiniMax/agent-dev`
- `ui-design` → `@MiniMax/ui-design`
- `feature-design` → `@MiniMax/feature-design`
- `corpus` → `@MiniMax/corpus`
- 兜底 → `@MiniMax/maintainers`

详见 [`../docs/contributing/team-setup.md`](../docs/contributing/team-setup.md) 完整设置流程。

## 10. 协作治理（.github/）

| 文件 | 作用 | 责任 |
|---|---|---|
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 必带"变更前预期 / 变更后端测效果" | 任何贡献者 |
| `.github/ISSUE_TEMPLATE/bug.md` | bug 报告模板 | reporter |
| `.github/ISSUE_TEMPLATE/feature.md` | feature 请求模板 | reporter |
| `.github/ISSUE_TEMPLATE/config.yml` | issue chooser 配置 | director |
| `.github/CODEOWNERS` | 4 human team reviewer 自动路由（maintainers / agent-dev / ui-design / feature-design / corpus） | CODEOWNERS 团队 |
| `.github/dependabot.yml` | 自动依赖升级（next/react/zod 分组） | dependabot |
| `.github/workflows/ci.yml` | typecheck + lint + build + 27 路径 evals + 8 RAG 路径 | CI |
| `.github/workflows/branch-name.yml` | PR 源分支名格式校验 | CI |

> **3 层各管各的**：
> - `.harness/agents/` = 5 AI 角色（运行时 / 契约层）
> - `.harness/roles/` = 4 human 角色（开发职责）
> - `.github/CODEOWNERS` = 4 team（review 路由层）
>
> 数量巧合是 5 / 4 / 4，但意义完全不同。详见 [`../docs/contributing/team-setup.md`](../docs/contributing/team-setup.md) 最后一节。

## 11. 文档（docs/）

| 路径 | 作用 |
|---|---|
| `docs/README.md` | 文档总目录 |
| `docs/architecture/overview.md` | 架构概览 |
| `docs/architecture/agents.md` | 5 AI 角色系统 |
| `docs/architecture/harness.md` | 治理层详解 |
| `docs/development/setup.md` | 本地开发 |
| `docs/development/branching.md` | 分支规范 |
| `docs/development/workflow.md` | 改代码标准流程 |
| `docs/deployment/local.md` | 本地部署 |
| `docs/deployment/cloud.md` | 云端部署（占位） |
| `docs/change-reports/` | 重大变更报告（含 TEMPLATE） |
| `docs/contributing/how-to-pr.md` | 怎么提 PR |
| `docs/contributing/how-to-issue.md` | 怎么提 issue |
| `docs/contributing/commit-conventions.md` | commit message 规范 |
| `docs/contributing/team-setup.md` | GitHub Team 设置指南 |
| `docs/contributing/cross-role-workflow.md` | 4 角色跨协作工作流 |
| `docs/contributing/skill-reference.md` | 4 skill 总览 |
