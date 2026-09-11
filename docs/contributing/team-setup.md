# GitHub Team 设置指南

> `.github/CODEOWNERS` 现在用 **4 个 human team**（对应 `.harness/roles/` 下的 4 个角色）。
> 角色定义见 [`.harness/roles/`](../../.harness/roles/)。
> 建 team 用 `node scripts/setup-teams.mjs` 一键搞定。

## 4 个 team 映射

| CODEOWNERS 占位 | 对应角色 | owner 目录 | 维护者 |
|---|---|---|---|
| `@MiniMax/maintainers` | （兜底 reviewer） | 全部 | 项目 owner（默认 review 所有） |
| `@MiniMax/agent-dev` | `agent-dev` | `src/agents/` + `src/user/` + `src/lib/{ai,rag,prompts,fallback,validators,types.ts}` + `app/api/` + `.harness/agents/` | agent-dev 负责人 |
| `@MiniMax/ui-design` | `ui-design` | `src/client/` + `components/` | ui-design 负责人 |
| `@MiniMax/feature-design` | `feature-design` | `app/api/` + `.harness/contracts/` + `.harness/evals/` + `tests/` + `.github/workflows/` | feature-design 负责人 |
| `@MiniMax/corpus` | `corpus` | `src/data/` + `scripts/` | corpus 负责人 |

> **重叠说明**：`app/api/` 同时被 `agent-dev` 和 `feature-design` 引用——因为 API 路由由 agent-dev 实现，但契约 + 测试由 feature-design 维护。GitHub CODEOWNERS 的规则是"后写的覆盖先写的"，所以 `feature-design` 那行写在 `agent-dev` 之后会胜出。如果要让 `agent-dev` review，**调换两行的顺序**即可。

> 跟 5 AI 角色（director / action / realist / conditional / user）的关系：5 AI 角色是运行时契约层，4 human team 是 review 路由层。详见 [`.harness/INDEX.md`](../../.harness/INDEX.md) 第 8 节。

## 一键建 team：scripts/setup-teams.mjs

不要手点 GitHub UI。准备一个 `GH_TOKEN`（需要 `admin:org` 权限）然后跑：

```bash
# 1. 改脚本里的 ORG 常量（默认 "MiniMax"）
# 编辑 scripts/setup-teams.mjs 第 17 行：
#   const ORG = "MiniMax";
# 改成你的 GitHub 组织名

# 2. 配 gh CLI
gh auth login
# 或：export GH_TOKEN=<your-token>

# 3. 列出组织里现有 team
node scripts/setup-teams.mjs list

# 4. 创建 4 个 team
node scripts/setup-teams.mjs create
# 输出：
#   Creating teams in @MiniMax...
#     creating team: agent-dev...
#       ✓ created (id=12345, slug=agent-dev)
#     creating team: ui-design...
#       ✓ created (id=12346, slug=ui-design)
#     creating team: feature-design...
#       ✓ created (id=12347, slug=feature-design)
#     creating team: corpus...
#       ✓ created (id=12348, slug=corpus)

# 5. 把主维护者加到所有 4 个 team
node scripts/setup-teams.mjs add-members your-github-handle

# 6. 验证
node scripts/setup-teams.mjs list
#   ✓ (in spec) agent-dev       — Knowledge Table Demo — Agent 运行时开发
#   ✓ (in spec) ui-design       — Knowledge Table Demo — UI 设计
#   ✓ (in spec) feature-design  — Knowledge Table Demo — 功能设计
#   ✓ (in spec) corpus          — Knowledge Table Demo — 语料收集
```

`setup-teams.mjs` 是 **idempotent** 的：
- 已存在的 team 会被跳过（不会报错）
- 用 `.tmp/team-cache.json` 缓存创建结果（即使重复跑也只 hit 一次 GitHub API）
- 加成员用 `PUT /orgs/.../teams/.../memberships/...`（已加的会更新，不会重复）

## 手动方式（不用脚本）

如果不想用 `gh` CLI，可以手动建：

### 1. 在 GitHub 组织里建 4 个 team

GitHub 组织 → Settings → Teams → New team。

| team 名称 | 描述（建议） | 可见性 |
|---|---|---|
| `maintainers` | Knowledge Table Demo — 默认兜底 reviewer | Visible |
| `agent-dev` | Knowledge Table Demo — Agent 运行时开发 | Visible |
| `ui-design` | Knowledge Table Demo — UI 设计 | Visible |
| `feature-design` | Knowledge Table Demo — 功能设计 | Visible |
| `corpus` | Knowledge Table Demo — 语料收集 | Visible |

> 注意：`maintainers` 是兜底，不是 agent-dev 的别名。它覆盖所有路径，确保 PR 总有人 review。

### 2. 加成员

| team | 加谁 |
|---|---|
| `maintainers` | 项目 owner（必须）+ 治理层维护者（可选 1-2 人） |
| `agent-dev` | 5 AI 角色运行时负责人（1-3 人） |
| `ui-design` | UI 负责人（1-3 人） |
| `feature-design` | API / 契约 / 测试负责人（1-3 人） |
| `corpus` | 语料收集负责人（1-3 人） |

> 一个人可以在多个 team。比如主维护者可以加到所有 4 个 team，每个负责人也可以加到 maintainers。

### 3. 验证

提一个测试 PR，改 `src/data/topics.json` 加一条空 entry：

- 期望：CODEOWNERS 自动加 `corpus` 为 reviewer
- 期望：CI 跑 `.github/workflows/ci.yml` 跑 27 路径 + 8 RAG 路径
- 期望：CI 跑 `.github/workflows/branch-name.yml` 校验分支名

## 维护

- 负责人变更 → 改对应 team 的成员
- 新增角色 → 在 `.harness/agents/<role>.md` 加契约 + `src/agents/<role>/` 加运行时 + `.harness/INDEX.md` 加映射 + `.github/CODEOWNERS` 加目录 + `node scripts/setup-teams.mjs create` 建新 team
- 删角色 → 反向操作
- team handle 改了 → 改 `CODEOWNERS` 里所有 `@MiniMax/<old>` → `@MiniMax/<new>`

## 跟其他文档的关系

- 4 角色总览：[`.harness/INDEX.md`](../../.harness/INDEX.md) 第 8 节
- 4 角色详情：[`.harness/roles/`](../../.harness/roles/)
- 4 skill 总览：[`skill-reference.md`](./skill-reference.md)
- 跨角色协作：[`cross-role-workflow.md`](./cross-role-workflow.md)
- 提 PR：[`how-to-pr.md`](./how-to-pr.md)
- 提 issue：[`how-to-issue.md`](./how-to-issue.md)
- 变更报告：[`../change-reports/TEMPLATE.md`](../change-reports/TEMPLATE.md)
