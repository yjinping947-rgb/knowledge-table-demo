# 知识拼桌 Demo · Knowledge Table

围绕"年轻人该不该裸辞？"的两轮 AI 结构化讨论 Demo。三个观点席位（行动 / 现实 / 条件）由多篇相似回答融合，并非真实答主。9 条来源均为明确标注的模拟数据，不包含虚假知乎链接。

> 📚 **完整文档看 [`docs/`](./docs/README.md)**：架构 / 开发 / 部署 / 变更报告 / 贡献指南。
> 本 README 只讲"如何跑起来"和"项目一句话"。

## 特性

- **结构化两轮讨论**：先表态 → 进情境 → 反思
- **AI 导演 + 兜底链路**：缺 key / 解析失败 / 来源越界自动 fallback，体验不中断
- **三个观点席位**：行动派（健康止损）、现实派（经济安全）、条件派（条件化路径）
- **个性化讨论地图**：共识 / 真正分歧 / 隐藏前提 / 立场轨迹 / 还没解决
- **20 房间 RAG**：基于真实答主语料的问答（详见 [`docs/change-reports/2026-09-12-rooms.md`](./docs/change-reports/2026-09-12-rooms.md)）
- **工程化 Harness**：agents.md 规范 + 双轨 agent 配置 + commitlint + husky + CI + PR 模板 + CODEOWNERS + Dependabot

## 启动

需要 Node.js 20.9 或更高版本（锁在 `.nvmrc`）。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

## 生产模式

```bash
npm run build
npm run start
```

## AI 配置

复制 `.env.example` 为 `.env.local`：

```text
AI_API_KEY=你的密钥
AI_BASE_URL=你的兼容接口地址（OpenAI 兼容）
AI_MODEL=qwen3-vl-flash
```

默认走阿里云百炼的 OpenAI 兼容接口。`AI_API_KEY` 或 `AI_BASE_URL` 任一缺失时自动进入演示模式；接口超时、输出解析失败、Zod 校验失败、来源越界时同样 fallback，体验不会中断。

## 验证

启动生产服务后：

```bash
node tests/core-branches.mjs
```

测试覆盖 27 路径（3 × 3 × 3）、来源约束、长度边界、非法输入。期望从 `.harness/evals/branches.json` 读。

## 目录结构

```
.harness/                  # 治理层（AGENTS.md / INDEX / agents / rules / skills / contracts / hooks / evals）
.github/                   # 协作治理（PR 模板 / Issue 模板 / CODEOWNERS / Dependabot / CI）
app/                       # Next.js App Router（薄壳 API 路由 + 冻结的 layout/page/css）
components/                # 薄壳 re-export
docs/                      # 工程文档（architecture / development / deployment / change-reports / contributing）
src/
├── user/                  # 用户域（UserSession / Trajectory）
├── data/                  # 数据索引（topic / seats / sources / rooms / rag-corpus / rag-embeddings）
├── agents/                # 4 个 agent 运行时
│   ├── director/          # 讨论导演
│   ├── action/            # 行动派
│   ├── realist/           # 现实派
│   └── conditional/       # 条件派
├── client/
│   ├── knowledge-table/   # 主 demo（state machine + stages + components）
│   ├── rooms/             # 20 房间（RAG 网格 + 详情页）
│   └── rooms-app/         # 房间应用入口
└── lib/                   # 基础设施（ai / prompts / validators / fallback / rag / types）
tests/                     # 核心回归
public/assets/             # 静态资源（刘看山插图，冻结）
```

## Harness

本项目以 `.harness/` 为治理层，对标 [agents.md](https://agents.md)、Cursor rules、Claude Code sub-agents、SWE-Agent hooks、OpenHands evaluation、Vue / Next.js / Supabase 的开源治理实践。详见 [`docs/architecture/harness.md`](./docs/architecture/harness.md)。

| 子目录 | 作用 |
|---|---|
| `AGENTS.md` | 项目级入口 |
| `INDEX.md` | 单一事实源：谁负责什么 |
| `agents/*.md` | 5 个角色（director / action / realist / conditional / user） |
| `rules/*.md` | 6 条规则（UI 不变性 / 编码 / 兜底 / 隐私 / 提交 / 分支） |
| `skills/*.md` | 4 个技能（写 reply / 生成讨论地图 / 写兜底 / 写变更报告） |
| `contracts/*.md` | 2 个契约（discuss / summary） |
| `hooks/*.mjs` | git 钩子（pre-commit / commit-msg） |
| `evals/branches.json` | 27 路径期望配置 |

每个 agent 在 `.harness/agents/*.md` 有契约层，在 `src/agents/*/` 有运行时实现。`INDEX.md` 第 2 节列映射。

## 协作治理（.github/）

| 文件 | 作用 |
|---|---|
| `PULL_REQUEST_TEMPLATE.md` | PR 必带"变更前预期"和"变更后端测效果" |
| `ISSUE_TEMPLATE/{bug,feature}.md` | 标准化 issue 报告 |
| `CODEOWNERS` | 5 角色 reviewer 路由 |
| `dependabot.yml` | 自动依赖升级（next / react / zod 分组） |
| `workflows/ci.yml` | typecheck + lint + build + 27 路径回归 |

## Git 工作流

- **conventional commits** 强制（commitlint 校验，详见 `.harness/rules/commit-policy.md`）
- **分支命名** `<type>/<scope>-<short-desc>`（详见 `.harness/rules/branch-policy.md`）
- pre-commit 自动跑 `npm run lint` + `npm test`
- commit-msg 自动跑 commitlint
- 所有钩子脚本在 `.harness/hooks/*.mjs`，跨平台（用 `node` 而非 `sh`）

## CI

GitHub Actions（`.github/workflows/ci.yml`）跑 typecheck + lint + build + 27 路径 evals。

## 约束

- **55 个 CSS class 全部保留**（详见 `.harness/rules/ui-invariance.md`）
- **8 个 stage** 状态机保持（`home` / `intro` / `round1-choice` / `round1-response` / `round2-choice` / `round2-response` / `reflection` / `result`）
- **AI key 只在服务端**（详见 `.harness/rules/privacy.md`）
- **缺 key 不抛错**，自动 fallback（详见 `.harness/rules/fallback-policy.md`）

## 文档

- [`docs/README.md`](./docs/README.md) — 文档总目录
- [`docs/architecture/overview.md`](./docs/architecture/overview.md) — 架构概览
- [`docs/architecture/agents.md`](./docs/architecture/agents.md) — 5 角色系统
- [`docs/architecture/harness.md`](./docs/architecture/harness.md) — 治理层详解
- [`docs/development/setup.md`](./docs/development/setup.md) — 本地开发
- [`docs/development/branching.md`](./docs/development/branching.md) — 分支规范
- [`docs/development/workflow.md`](./docs/development/workflow.md) — 改代码的标准流程
- [`docs/deployment/local.md`](./docs/deployment/local.md) — 本地部署
- [`docs/deployment/cloud.md`](./docs/deployment/cloud.md) — 云端部署（占位）
- [`docs/change-reports/`](./docs/change-reports/) — 重大变更报告
- [`docs/contributing/how-to-pr.md`](./docs/contributing/how-to-pr.md) — 怎么提 PR
- [`docs/contributing/how-to-issue.md`](./docs/contributing/how-to-issue.md) — 怎么提 issue
- [`docs/contributing/commit-conventions.md`](./docs/contributing/commit-conventions.md) — commit 规范
