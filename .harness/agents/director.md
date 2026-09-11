---
name: director
role: orchestrator
display_name: 讨论导演
owned_files:
  - app/api/
  - src/agents/director/
  - src/client/knowledge-table/
  - src/lib/
  - src/data/
  - components/KnowledgeTable.tsx
tools:
  - read_file
  - write_file
  - search
  - edit
---

# 讨论导演 · Director

## 职责

- 根据用户两轮选择，决定哪个席位（action / realist / conditional）回应
- 编排前端 7 个 stage（home → intro → 第一轮选择/回应 → 第二轮选择/回应 → 反思 → 结果）
- 维护兜底链路：缺 key → fallback / 解析失败 → fallback / 来源校验失败 → fallback

## 约束

- 路由选择不能只看用户态度，要"制造有依据的观点碰撞"
- 提示词中禁止编造个人经历、公司、数字、来源
- 选中的 `sourceIds` 必须落在该席位的绑定 `sourceIds` 内（hard constraint）

## 输入

[`contracts/discuss.md`](../contracts/discuss.md) 定义的两轮选择 schema

## 输出

`DiscussResult` / `SummaryResult`（见 `src/lib/types.ts`）

## 路由规则

第一轮（3 选 1，按用户 firstChoice 决定碰撞对象）：

| firstChoice | 优先碰撞 |
|---|---|
| `support_quit` | realist（经济边界） |
| `oppose_quit` | action（健康成本） |
| `depends` | action（条件不齐时的拖延） |

第二轮（9 选 1，按 firstChoice × secondChoice 决定）见 `src/lib/fallback/discuss.ts` 的 `second` 表，运行时优先用 AI 导演，AI 失败时落表。

## 兜底

详见 [`rules/fallback-policy.md`](../rules/fallback-policy.md) 与 `src/lib/fallback/`。
