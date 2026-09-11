# 架构概览

> 本文档画"知识拼桌"项目的整体结构与数据流。代码细节看 `.harness/agents/*.md`。

## 一句话

围绕"年轻人该不该裸辞？"做两轮 AI 结构化讨论 demo。三个观点席位（行动 / 现实 / 条件）由多篇相似回答融合，并非真实答主。

## 角色系统

```
                     ┌──────────┐
   user  ─选择─▶     │ director │  ─路由─▶  席位 A
                     │  (导演)  │  ─路由─▶  席位 B
                     │          │  ─路由─▶  席位 C
                     └─────┬────┘
                           │ fallback
                     ┌─────▼────┐
                     │ fallback │  ─统一兜底（缺 key / 解析失败 / 越界）
                     └──────────┘
```

- **director**（导演）— 决定哪一席位回应、维护兜底链路
- **action**（行动派）— 健康止损立场，绑定 S01-S03
- **realist**（现实派）— 经济安全立场，绑定 S04-S06
- **conditional**（条件派）— 条件判断立场，绑定 S07-S09
- **user**（用户域）— 抽象出"用户在哪一立场 / 怎么变的"的数据结构

详见 [`agents.md`](./agents.md)。

## 数据流

```
用户选择（firstChoice / secondChoice）
        │
        ▼
   POST /api/discuss  ──director 路由──▶  AI 导演选席位
        │                                │ 失败 → fallback
        ▼
   DiscussResult { selectedSeatId, reply, hostComment, sourceIds, mode }
        │
        ▼
   前端 KnowledgeTableState 更新
        │
        ▼
   POST /api/summary  ──AI 生成 4 象限 + trajectory
        │              │ 失败 → fallback
        ▼
   SummaryResult { consensus, disagreement, hiddenAssumption, trajectory, openQuestion, mode }
```

## 模块分层

```
┌─────────────────────────────────────────┐
│ app/              Next.js App Router     │ ← 薄壳（仅 route.ts + layout/page/css）
├─────────────────────────────────────────┤
│ src/client/       前端 state + stages    │ ← React + CSS（55 class 冻结）
│ src/agents/       4 个 agent 运行时      │ ← director + 3 席位
├─────────────────────────────────────────┤
│ src/lib/          基础设施                │ ← ai / fallback / prompts / rag / validators
│ src/data/         本地数据（type/sources） │ ← JSON + 类型化导出
│ src/user/         用户域抽象类型          │ ← UserSession / Trajectory
└─────────────────────────────────────────┘
```

## 治理层

- 治理层在 `.harness/`，对标 [agents.md](https://agents.md/) 规范
- 双轨 agent：契约层（`.harness/agents/*.md`）+ 运行时层（`src/agents/*/`）
- 详见 [`harness.md`](./harness.md)

## 不变性约束

55 个 CSS class、8 个 stage 状态机、3 个 API 路由、4 个 agent、9 条来源、3 段 trajectory label —— 都是"冻结"的。任何变更必须先读对应规则：

- UI（class / stage）→ `.harness/rules/ui-invariance.md`
- API 路由 → `.harness/contracts/{discuss,summary}.md`
- 席位 prompt → `.harness/agents/{action,realist,conditional}.md`
- 提交规范 → `.harness/rules/commit-policy.md`
