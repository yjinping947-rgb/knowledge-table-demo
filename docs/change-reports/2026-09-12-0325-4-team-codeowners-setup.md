# 4 个 GitHub team + CODEOWNERS 升级

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 时间戳 | 03-25 |
| 作者 | @always |
| 关联 commit | （本次） |
| 影响模块 | `.github/CODEOWNERS` + `scripts/setup-teams.mjs`（新）+ `docs/contributing/team-setup.md` + `.harness/INDEX.md` |

## 变更前预期

### 用户行为

- 不变 — review 路由是后台 admin 行为，对外接口 0 影响
- PR 改不同目录，自动 assign 不同 reviewer 的工作流不变

### 数据 / API

- 不变 — 不改任何运行时
- 仅改 CODEOWNERS 占位 handle（3 team → 4 team）+ 加一键建 team 脚本

### 兼容性

- 完全兼容 — 现有 PR 流程不变
- 旧的 3 team handle（`director-team` / `seats-team`）现在用 4 team handle（`agent-dev` / `ui-design` / `feature-design` / `corpus`）
- 老的 team 没用过（之前没建过），所以无迁移成本

### Harness 影响

- 治理层 review 路由：3 team → **4 team**（更细粒度，对应 4 human 角色）
- 加 `scripts/setup-teams.mjs`（Node + gh CLI 一键建 team）

## 改了什么

| 路径 | 改动 |
|---|---|
| `.github/CODEOWNERS` | 从 3 team（`maintainers` / `director-team` / `seats-team`）改 4 team（`maintainers` / `agent-dev` / `ui-design` / `feature-design` / `corpus`），每个 team 都有明确 owner 目录 |
| `scripts/setup-teams.mjs`（新） | Node 脚本，用 `gh API` 一键创建 4 个 team + 加成员，idempotent |
| `docs/contributing/team-setup.md` | 反映 4 团队结构 + 加 `setup-teams.mjs` 用法 |
| `.harness/INDEX.md` 第 8/9 节 | CODEOWNERS 团队映射表更新 + 加 `setup-teams.mjs` 说明 |

## 变更后端测效果

### 自动化测试

- `npm run build` — TypeScript 2.2s + Next 16.3.4 build 651ms 通过
- `node tests/core-branches.mjs` — **PASS: 3 first-round / 9 combined / 27 summaries**
- `node tests/rooms-rag.mjs` — **PASS: 8 RAG path checks**

### 手动验证

- `git check-ignore -v src/data/topic-embeddings.json` → 命中 `.gitignore:25` ✓
- `git status --short` → 没有未跟踪的 `.tmp/` / `*.log` / 33MB embeddings 文件 ✓
- 4 个 team handle 跟 `.harness/roles/` 4 个角色一一对应 ✓
- `app/api/` 同时被 `agent-dev` 和 `feature-design` 引用（重叠）—— 在 team-setup.md 解释了顺序问题

### 边界 / 异常

- 不动 frozen 资源（`app/globals.css` / `app/layout.tsx` / `app/page.tsx` / `public/assets/`）
- 不改运行时
- 不改任何已 commit 的代码

## 风险 / 回滚

- **风险点**：CODEOWNERS 里 `app/api/` 同时被 `agent-dev` 和 `feature-design` 引用。CODEOWNERS 是"后写覆盖先写"，所以 `feature-design` 胜出。如果想让 `agent-dev` review，调换两行顺序即可
  - 缓解：team-setup.md 解释了这个
- **风险点**：team handle 用了占位 `@MiniMax/<role>-team`，需要组织 owner 跑 `setup-teams.mjs` 才会真正生效
  - 缓解：脚本在 commit 后可立即跑
- **回滚方式**：`git revert <commit-hash>` — 治理层变更不影响运行时
- **回滚后状态**：恢复 3 team（maintainers / director-team / seats-team）

## 后续 TODO

- [ ] 组织 owner 跑 `node scripts/setup-teams.mjs create`
- [ ] 主维护者跑 `node scripts/setup-teams.mjs add-members <your-handle>`
- [ ] 提一个测试 PR 验证 reviewer 路由生效
- [ ] 如果要更细粒度，把 `app/api/` 拆开（agent-dev 管实现，feature-design 管测试）

## review team 数对比

| 层 | 数量 | 含义 |
|---|---|---|
| `.harness/agents/` | 5 | AI 角色（运行时 / 契约层） |
| `.harness/roles/` | 4 | Human 团队角色（开发职责） |
| `.github/CODEOWNERS` | 4 + 1 兜底 | review 路由（admin 层） |

3 层各管各的：5 AI 角色 = 项目本质；4 human 角色 = 团队分工；4 team = 路由实现。

## 跟其他文档的关系

- 4 角色总览：[`.harness/INDEX.md`](../../.harness/INDEX.md) 第 8 节
- 4 角色详情：[`.harness/roles/`](../../.harness/roles/)
- Team 设置详细：[`../docs/contributing/team-setup.md`](../../docs/contributing/team-setup.md)
- 跨角色协作：[`../docs/contributing/cross-role-workflow.md`](../../docs/contributing/cross-role-workflow.md)
- Skill 总览：[`../docs/contributing/skill-reference.md`](../../docs/contributing/skill-reference.md)
- commit-with-rationale 技能：[`.harness/skills/commit-with-rationale.md`](../../.harness/skills/commit-with-rationale.md)
- 变更报告模板：[`./TEMPLATE.md`](./TEMPLATE.md)
