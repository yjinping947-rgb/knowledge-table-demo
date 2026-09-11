# 知识拼桌 Demo · Knowledge Table

围绕"年轻人该不该裸辞？"的两轮 AI 结构化讨论 Demo。三个观点席位（行动 / 现实 / 条件）由多篇相似回答融合，并非真实答主。9 条来源均为明确标注的模拟数据，不包含虚假知乎链接。

## 特性

- **结构化两轮讨论**：先表态 → 进情境 → 反思
- **AI 导演 + 兜底链路**：缺 key / 解析失败 / 来源越界自动 fallback，体验不中断
- **三个观点席位**：行动派（健康止损）、现实派（经济安全）、条件派（条件化路径）
- **个性化讨论地图**：共识 / 真正分歧 / 隐藏前提 / 立场轨迹 / 还没解决
- **工程化 Harness**：agents.md 规范 + 双轨 agent 配置 + commitlint + husky + CI

## 启动

需要 Node.js 20.9 或更高版本。

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
app/                       # Next.js App Router（薄壳 API 路由 + 冻结的 layout/page/css）
components/                # 薄壳 re-export
src/
├── user/                  # 用户域
├── data/                  # 数据索引（topic / seats / sources）
├── agents/                # 5 个 agent 运行时
│   ├── director/          # 讨论导演
│   ├── action/            # 行动派
│   ├── realist/           # 现实派
│   └── conditional/       # 条件派
├── client/knowledge-table/# 前端（state machine + stages + components）
└── lib/                   # 基础设施（ai / prompts / validators / fallback / types）
tests/                     # 核心回归
public/assets/             # 静态资源（刘看山插图，冻结）
```

## Harness

本项目以 `.harness/` 为治理层，对标 [agents.md](https://agents.md)、Cursor rules、Claude Code sub-agents、SWE-Agent hooks、OpenHands evaluation。

| 子目录 | 作用 |
|---|---|
| `AGENTS.md` | 项目级入口 |
| `INDEX.md` | 单一事实源：谁负责什么 |
| `agents/*.md` | 5 个角色（director / action / realist / conditional / user） |
| `rules/*.md` | 5 条规则（UI 不变性 / 编码 / 兜底 / 隐私 / 提交） |
| `skills/*.md` | 3 个技能（写 reply / 生成讨论地图 / 写兜底） |
| `contracts/*.md` | 2 个契约（discuss / summary） |
| `hooks/*.mjs` | git 钩子（pre-commit / commit-msg） |
| `evals/branches.json` | 27 路径期望配置 |

每个 agent 在 `.harness/agents/*.md` 有契约层，在 `src/agents/*/` 有运行时实现。`INDEX.md` 第 2 节列映射。

## Git 工作流

- **conventional commits** 强制（commitlint 校验，详见 `.harness/rules/commit-policy.md`）
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
