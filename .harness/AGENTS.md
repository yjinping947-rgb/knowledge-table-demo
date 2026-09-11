---
name: knowledge-table-demo
type: project-root
spec: agents.md
generated_by: Mavis (MiniMax Code)
generated_at: 2026-09-12
---

# AGENTS.md · 知识拼桌 Demo

> 本文件是所有 agent 进入本项目的必读入口，符合 [agents.md](https://agents.md/) 规范。
> 子目录可放 `AGENTS.md` 做局部覆盖。

## 1. 项目一句话

围绕"年轻人该不该裸辞？"做两轮 AI 结构化讨论 Demo。三个观点席位（action / realist / conditional）从 **1175 条知乎真实回答**中检索。**不再调 LLM 生成 reply** —— reply / hostComment 来自 RAG 库真实内容（详见 commit `b8e564f` 与 `../docs/change-reports/` 最近几份）。

## 2. 必读顺序

进入本项目的 agent 必须先读：

1. 本文件
2. [`.harness/INDEX.md`](./INDEX.md) — 单一事实源：谁负责什么
3. **自己的角色**：[`.harness/roles/<your-role>.md`](./roles/) — agent-dev / ui-design / feature-design / corpus
4. 任务相关的 [`.harness/rules/`](./rules/) 之一
5. 涉及 AI 角色时，读对应 [`.harness/agents/`](./agents/) 之一
6. 做对应类型工作时，读 [`.harness/skills/`](./skills/) 之一
7. **改 API 时**，读对应 [`.harness/contracts/`](./contracts/)
8. **写变更报告 / PR 时**，用 [`.harness/skills/commit-with-rationale.md`](./skills/commit-with-rationale.md) + [`../docs/change-reports/TEMPLATE.md`](../docs/change-reports/TEMPLATE.md)
9. **跨角色协作时**，用 [`.harness/skills/request-from-teammate.md`](./skills/request-from-teammate.md)
10. **理解架构 / 部署 / 工作流时**，读 [`../docs/`](../docs/README.md) 下的对应文件

## 3. 启动 & 验证

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start  # 生产模式
npm run test:all   # 27 路径 + 8 RAG 路径（需先 start）
```

加新语料后必跑：
```bash
npm run rag:build  # 调 embedding API 生成 1175+ 条向量（约 2.5 min）
npm run test:all   # 验证
```

## 4. 目录地图

| 路径 | 作用 | 变更权限 |
|---|---|---|
| `app/` | Next.js App Router | 仅改 import |
| `src/` | 业务代码（user/agents/client/lib/data） | 可改 |
| `components/` | 薄壳 re-export | 仅 re-export |
| `tests/` | 核心分支回归 | 可改 |
| `docs/` | 工程文档（architecture/development/deployment/change-reports/contributing） | 可改 |
| `scripts/` | 语料采集 + embedding 脚本 | 可改 |
| `public/assets/` | 静态资源（刘看山插图） | **冻结** |
| `app/globals.css` | 样式（55 个 class） | **冻结** |
| `app/layout.tsx` / `app/page.tsx` | 根布局/首页 | **冻结** |
| `.harness/` | 治理层 | 改时同步 INDEX.md |

## 5. 核心约束

- **UI 不变性**（[`rules/ui-invariance.md`](./rules/ui-invariance.md)）：55 个 CSS class 全部保留，stage 数量保持 8 个
- **隐私**（[`rules/privacy.md`](./rules/privacy.md)）：`AI_API_KEY` 只在服务端使用
- **兜底**（[`rules/fallback-policy.md`](./rules/fallback-policy.md)）：缺 key / 解析失败 / 校验失败时必须走 fallback
- **提交**（[`rules/commit-policy.md`](./rules/commit-policy.md)）：conventional commits，commitlint 校验
- **分支**（[`rules/branch-policy.md`](./rules/branch-policy.md)）：`<type>/<scope>-<short-desc>` 命名

## 6. 4 个核心 skill

| Skill | 何时用 |
|---|---|
| [`.harness/skills/commit-with-rationale.md`](./skills/commit-with-rationale.md) | 每次 `git commit` 前 |
| [`.harness/skills/deploy-app.md`](./skills/deploy-app.md) | 本地 / 云端部署 |
| [`.harness/skills/request-from-teammate.md`](./skills/request-from-teammate.md) | 跨角色协作（提需求 / 扫需求） |
| [`.harness/skills/add-corpus.md`](./skills/add-corpus.md) | 加新语料 |

详见 [`../docs/contributing/skill-reference.md`](../docs/contributing/skill-reference.md) 与 [`../docs/contributing/cross-role-workflow.md`](../docs/contributing/cross-role-workflow.md)。

## 7. 5 AI 角色 + 4 Human 角色

**5 AI 角色**（运行时 / 契约层）：`.harness/agents/`

- `director.md`（业务编排）
- `action.md` / `realist.md` / `conditional.md`（3 席位）
- `user.md`（user 域抽象）

**4 Human 角色**（开发职责）：`.harness/roles/`

- `agent-dev.md`（Agent 运行时开发）
- `ui-design.md`（UI 设计）
- `feature-design.md`（功能设计）
- `corpus.md`（语料收集）

详见 [`.harness/INDEX.md`](./INDEX.md) 第 2、3 节。

## 8. 评审与变更

任何 agent 修改本目录（`.harness/`）下文件时，必须：

- 保持 frontmatter 完整
- 同步 INDEX.md 的对应行
- 跑 `npm run test:all` 验证（27 + 8 路径）
- 改 UI 相关文件时必须先读 `rules/ui-invariance.md`
- 写变更报告（如果触及 API / 席位 prompt / fallback / 数据结构 / frozen 资源）—— 用 [`commit-with-rationale`](./skills/commit-with-rationale.md) skill

## 9. 协作治理（.github/）

- **PR 模板**：`.github/PULL_REQUEST_TEMPLATE.md` — 必带"变更前预期"和"变更后端测效果"
- **Issue 模板**：`.github/ISSUE_TEMPLATE/{bug,feature}.md`
- **CODEOWNERS**：`.github/CODEOWNERS` — 3 团队 reviewer 自动路由（maintainers / director-team / seats-team）
- **Dependabot**：`.github/dependabot.yml` — 自动依赖升级
- **CI**：`.github/workflows/ci.yml` — typecheck + lint + build + 27 路径 evals + 8 RAG 路径
- **branch-name**：`.github/workflows/branch-name.yml` — PR 源分支名格式校验

详细流程看 [`../docs/contributing/how-to-pr.md`](../docs/contributing/how-to-pr.md) 与 [`../docs/development/workflow.md`](../docs/development/workflow.md)。
