# 文档目录

> 这是知识拼桌 Demo 的文档总入口。代码说明以 `.harness/AGENTS.md` 为准；
> 这里聚焦"工程实践"与"使用/部署"。

## 一图速览

```
docs/
├── README.md                       ← 你在这里
├── architecture/                   ← 架构 & 设计决策
│   ├── overview.md                 — 项目一句话、5 角色、数据流
│   ├── agents.md                   — 5 角色 + 双轨（契约层 + 运行时层）
│   └── harness.md                  — 治理层结构与触发场景
│
├── development/                    ← 开发者日常
│   ├── setup.md                    — 本地开发环境搭建
│   ├── branching.md                — 分支规范（与 .harness/rules/branch-policy.md 同步）
│   └── workflow.md                 — 改代码 → 跑测试 → 提 PR 的完整流程
│
├── deployment/                     ← 部署
│   ├── local.md                    — 本地起服务 / 排错
│   ├── cloud.md                    — 云端部署（provider-neutral 门槛）
│   └── records/                    — 每次本地 / CI / 云端部署证据
│
├── harness/                        ← harness 入口与工件分层
│
├── requests/                       ← 跨角色需求记录（无 gh 时的共享真源）
│
├── change-reports/                 ← 重大变更报告（前置预期 / 后置端测）
│   ├── TEMPLATE.md                 — 模板
│   └── YYYY-MM-DD-<slug>.md        — 实际变更报告
│
└── contributing/                   ← 协作约定
    ├── how-to-pr.md                — 怎么提 PR
    ├── how-to-issue.md             — 怎么提 issue
    └── commit-conventions.md       — commit message 规范
```

## 怎么读这份文档

- **新加入项目的开发者**：先看 `architecture/overview.md` → `architecture/agents.md` → `development/setup.md` → `architecture/harness.md`
- **准备改代码的人**：先看 `.harness/AGENTS.md` → `architecture/harness.md` → 对应模块的 owner（查 `.harness/INDEX.md`）
- **准备部署到云端的人**：`deployment/local.md` → `deployment/cloud.md`（先看 local 把代码跑通）
- **准备跨角色协作的人**：先用 `.harness/skills/request-from-teammate.md` 扫描 `requests/` 和 `change-reports/`
- **准备回看"我们之前怎么做的"**：`change-reports/` 按时间倒序读

## 与其他文档的边界

| 文档 | 何时读 | 谁负责 |
|---|---|---|
| `README.md`（项目根） | 第一次接触项目 / 快速跑起来 | director |
| `.harness/AGENTS.md` | 任何 agent 进入项目 | 治理层 |
| `.harness/INDEX.md` | 改 `.harness/` 下任何文件前 | 治理层 |
| `.harness/rules/*.md` | 改对应类型代码前 | 治理层 |
| `.harness/skills/*.md` | 做对应类型工作前 | 治理层 |
| `docs/architecture/*.md` | 想理解设计决策 | director |
| `docs/development/*.md` | 准备改代码 / 提 PR | director |
| `docs/deployment/*.md` | 准备跑 / 部署服务 | director |
| `docs/deployment/records/` | 回看部署健康检查、测试和回滚证据 | 各部署负责人 |
| `docs/harness/` | 理解 harness 入口、manifest 与工件分层 | 治理层 |
| `docs/requests/` | 无 GitHub CLI 时的跨角色需求共享记录 | 各角色 |
| `docs/change-reports/*.md` | 回看变更历史 / 写新报告 | 各 PR 作者 |
| `docs/contributing/*.md` | 提 PR / 提 issue | 任何贡献者 |
