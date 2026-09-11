# 治理层（.harness/）

> 治理层 = 项目的"宪法 + 部门规章 + 流程手册"。对标 agents.md / Cursor rules / Claude Code sub-agents / SWE-Agent hooks / OpenHands evaluation。

## 目录结构

```
.harness/
├── AGENTS.md                  ← 项目级入口（必读）
├── INDEX.md                   ← 单一事实源（谁负责什么）
│
├── agents/                    ← 5 角色契约（双轨中的"契约层"）
│   ├── director.md
│   ├── action.md
│   ├── realist.md
│   ├── conditional.md
│   └── user.md
│
├── rules/                     ← 5 条规则（强约束）
│   ├── ui-invariance.md       ← 55 class + 8 stage 不变
│   ├── coding-standards.md    ← TypeScript / import 顺序 / 单文件 300 行
│   ├── fallback-policy.md     ← 兜底触发条件与写作要求
│   ├── privacy.md             ← AI key 只在服务端
│   └── commit-policy.md       ← conventional commits
│
├── skills/                    ← 3 个技能（按需加载）
│   ├── write-seat-reply.md    ← 为席位写 reply 时
│   ├── generate-summary-map.md← 生成 summary 4 象限时
│   └── author-fallback.md     ← 写兜底内容时
│
├── contracts/                 ← 2 个契约（API 路由）
│   ├── discuss.md             ← POST /api/discuss
│   └── summary.md             ← POST /api/summary
│
├── hooks/                     ← 2 个 git 钩子（跨平台 Node 脚本）
│   ├── pre-commit.mjs         ← 跑 lint + test
│   └── commit-msg.mjs         ← 跑 commitlint
│
└── evals/
    └── branches.json          ← 27 路径期望配置
```

## 5 个关键流程

### 1. 任何 agent 进入项目

```
读 .harness/AGENTS.md
  → 读 .harness/INDEX.md（了解谁负责什么）
    → 读对应的 .harness/agents/<role>.md（如果改角色）
    → 读对应的 .harness/rules/<rule>.md（如果改相关代码）
      → 读对应的 .harness/skills/<skill>.md（如果做对应工作）
```

### 2. 改代码

```
先看 .harness/INDEX.md 第 1 节（module → owner）
  → 确认我是 owner（或拉 owner review）
    → 读对应的 .harness/rules/*.md
      → 改代码
        → 跑 npm run lint
        → 跑 node tests/core-branches.mjs（如果改 discuss / summary / fallback）
```

### 3. 加新 agent

```
在 .harness/agents/<role>.md 写契约
  → 在 src/agents/<role>/ 写运行时（index.ts + prompt.ts）
    → 在 .harness/INDEX.md 第 1 + 2 节加映射
      → 如果要新 prompt 类型，在 .harness/skills/ 加技能
        → 如果改 API 路由，更新 .harness/contracts/
          → 跑 27 路径测试
```

### 4. 改 UI

```
必读 .harness/rules/ui-invariance.md
  → 不删 / 改 / 重命名任何 className
  → 不改 app/globals.css（冻结）
  → 不改 app/layout.tsx（冻结）
  → 不改 app/page.tsx（冻结）
  → 不改 public/assets/（冻结）
  → 不增删 stage（保持 8 个）
  → 抽出原子组件 / stage 组件 / state machine
```

### 5. 提 PR

```
按 .github/PULL_REQUEST_TEMPLATE.md 写
  → 关联对应 issue / change-reports/<date>-<slug>.md
  → 写"变更前预期"
  → 改完写"变更后端测效果"
  → CODEOWNERS 自动加 reviewer
  → CI 必须全绿
  → 至少 1 个 maintainer + 涉及模块 owner approve
```

## 为什么这套治理是先进的

| 维度 | 普通项目 | 本项目 |
|---|---|---|
| Agent 契约 | 没文档 | 双轨：契约层 + 运行时层 |
| 单一事实源 | 散落在 README / wiki | `.harness/INDEX.md` 7 节串起来 |
| Git 钩子 | sh 脚本（Windows 不友好） | Node 脚本（跨平台）|
| 测试覆盖 | 手动验证 | 27 路径自动回归 + 异常路径 |
| UI 不变性 | 没有 | 55 class + 8 stage 强约束 + 验证脚本 |
| 提交规范 | commitlint（基础） | commitlint + husky + pre-commit.mjs + CI + branch-policy + change-reports |
| 隐私 | 散落在 README | `.harness/rules/privacy.md` + 服务端 only + 验证命令 |

## 跟开源对标

- **[agents.md](https://agents.md/)** — 项目级入口的格式
- **Cursor rules** — 5 条 `rules/*.md` 的结构
- **Claude Code sub-agents** — 5 个 `agents/*.md` 角色契约
- **SWE-Agent hooks** — `.harness/hooks/*.mjs` 跨平台 Node 脚本
- **OpenHands evaluation** — `evals/branches.json` + 27 路径回归
- **Vue / Next.js / Nuxt** — `.github/{PULL_REQUEST_TEMPLATE,ISSUE_TEMPLATE,CODEOWNERS,dependabot.yml}`
- **Supabase** — `docs/` 分层 + 部署文档结构
