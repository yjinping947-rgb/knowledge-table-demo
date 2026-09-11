# GitHub Team 设置指南

> `.github/CODEOWNERS` 简化到 **3 个 review team**（admin 友好），但 `.harness/agents/` 仍是 **5 角色**（运行时不变）。
> 详细分工见最后一节"review team vs agent 角色"。

## 3 个 team 映射

CODEOWNERS 里用的占位 → 真实 team：

| CODEOWNERS 占位 | 职责 | 建议 team 名称 | 维护者 |
|---|---|---|---|
| `@MiniMax/maintainers` | 兜底 reviewer + frozen 资源 + 治理层 | `MiniMax/maintainers` | 项目 owner |
| `@MiniMax/director-team` | 业务编排（director agent + 客户端 + 基础设施） | `MiniMax/director-team` | director 负责人 |
| `@MiniMax/seats-team` | 3 席位（action/realist/conditional）+ 用户域 | `MiniMax/seats-team` | 席位负责人（可同一人） |

> **为什么不按 5 角色各建 1 个 team**：3 席位（action/realist/conditional）每个只占 2 个文件（`src/agents/<seat>/` + `src/lib/prompts/seats/<seat>.ts`），user 域只占 1 个目录。如果按 5 角色各建 team，每个 team 平均只 review 2 个文件，admin 成本远高于收益。合并到 `seats-team` 后，一个 reviewer 覆盖 4 个 agent 角色的相关文件。

## 步骤

### 1. 在 GitHub 组织里建 3 个 team

GitHub 组织 → Settings → Teams → New team。

对每个 team：

| team 名称 | 描述（建议） | 可见性 |
|---|---|---|
| `maintainers` | Knowledge Table Demo — 默认兜底 reviewer | Visible |
| `director-team` | Knowledge Table Demo — 业务编排 / 基础设施 reviewer | Visible |
| `seats-team` | Knowledge Table Demo — 席位 + 用户域 reviewer | Visible |

### 2. 加成员

| team | 加谁 |
|---|---|
| `maintainers` | 项目 owner（必须）+ 治理层维护者（可选 1-2 人） |
| `director-team` | 业务编排负责人（1-3 人） |
| `seats-team` | 席位负责人（1-3 人，可兼任多个席位） |

> 一个人可以在多个 team 里。比如 director 负责人也加到 maintainers，席位负责人也加到 maintainers。

### 3. 验证

提一个测试 PR，改一个 `src/agents/action/index.ts` 的注释：

- 期望：CODEOWNERS 自动加 `seats-team` 为 reviewer
- 期望：CI 跑 `.github/workflows/branch-name.yml` 校验分支名
- 期望：CI 跑 `.github/workflows/ci.yml` 跑 27 路径 + 8 RAG 路径

### 4. 维护

- 负责人变更 → 改对应 team 的成员
- 席位职责变更（如新增第 4 席位）→ 在 `.harness/agents/<role>.md` 加契约 + 在 `src/agents/<role>/` 加运行时 + 在 `.harness/INDEX.md` 加映射 + 在 `.github/CODEOWNERS` 的 `seats-team` 段加 2 行
- 拆 seats-team（席位多了拆开）→ 在组织里新建 team + 在 CODEOWNERS 把对应行单独提出来

## review team vs agent 角色

| 维度 | `.harness/agents/`（运行时） | `.github/CODEOWNERS`（review） |
|---|---|---|
| 数量 | **5**（director + 3 席位 + user） | **3**（maintainers + director-team + seats-team） |
| 作用 | 5 个 agent 的契约 / 运行时实现 | 改文件时谁 review |
| 拆/合 | 不能拆（每个 agent 立场不同） | 可灵活拆合（按 admin 成本） |
| 修改入口 | `.harness/agents/<role>.md` + `src/agents/<role>/` | `.github/CODEOWNERS` |

也就是说：**5 角色是项目本质，3 team 是 admin 选择**。未来席位增加（如加 moderator / fact-checker），可以把 seats-team 拆成多个。

## 跟 `.harness/agents/` 的对应

| `.harness/agents/<role>.md` | GitHub team | 共同维护的目录 |
|---|---|---|
| `director.md` | `director-team` | `app/` `src/agents/director/` `src/client/` `src/lib/` `src/data/` `components/` `tests/` `scripts/` `.harness/contracts/` `.harness/evals/` |
| `action.md` | `seats-team` | `src/agents/action/` `src/lib/prompts/seats/action.ts` |
| `realist.md` | `seats-team` | `src/agents/realist/` `src/lib/prompts/seats/realist.ts` |
| `conditional.md` | `seats-team` | `src/agents/conditional/` `src/lib/prompts/seats/conditional.ts` |
| `user.md` | `seats-team` | `src/user/` |
| (跨角色) | `maintainers` | `.harness/`（`AGENTS.md` `INDEX.md` `rules/` `skills/` `hooks/`）`app/globals.css` `app/layout.tsx` `app/page.tsx` `public/assets/` `package.json` `package-lock.json` `.github/` |

## 参考

- [GitHub Docs — About teams](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams)
- [GitHub Docs — CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [`.harness/agents/`](../../.harness/agents/) — 角色契约（5 个）
- [`.github/CODEOWNERS`](../../.github/CODEOWNERS) — 当前 review 路由（3 team）
