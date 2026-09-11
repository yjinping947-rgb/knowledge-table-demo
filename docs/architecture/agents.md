# 角色系统（5 角色 + 双轨）

> 5 角色 = director（导演）+ action / realist / conditional（3 席位）+ user（用户域）。
> 双轨 = 契约层（`.harness/agents/<role>.md`）+ 运行时层（`src/agents/<role>/`）。

## 角色一览

| 角色 | 职责 | 触发场景 | owned files |
|---|---|---|---|
| director | 路由 + 编排 + 兜底 | 任何用户选择 | `app/api/` `src/agents/director/` `src/client/` `src/lib/` `src/data/` `components/` |
| action | 健康止损立场 | 用户在 7 个路径中需要被"提醒健康成本"时 | `src/agents/action/` `src/lib/prompts/seats/action.ts` |
| realist | 经济安全立场 | 用户在 7 个路径中需要被"提醒经济边界"时 | `src/agents/realist/` `src/lib/prompts/seats/realist.ts` |
| conditional | 条件判断立场 | 用户在 7 个路径中需要被"提醒条件化路径"时 | `src/agents/conditional/` `src/lib/prompts/seats/conditional.ts` |
| user | 抽象"用户在哪一立场 / 怎么变" | director 路由时不读 user 过去选择 | `src/user/` |

## 双轨的含义

每个角色有两份"说明书"：

- **契约层** = `.harness/agents/<role>.md`
  - 角色是谁、立场是什么、绑定哪些 sourceId、什么时候触发、怎么协作
  - 写给"agent"看（人类或 AI），规范性强
  - 改了之后要同步 `.harness/INDEX.md`

- **运行时层** = `src/agents/<role>/`
  - index.ts：对外暴露的 API（通常是 `choose / generate` 之类）
  - prompt.ts：席位专属 prompt 模板（仅席位有）
  - router.ts：导演专属（路由表）
  - 写给"Node.js"看，可执行

两份要保持一致。改了运行时没改契约 → 契约失真；改了契约没改运行时 → 用户看不见变化。

## 路由规则（director 决策）

### 第一轮（3 选 1）

| firstChoice | 优先碰撞 | 原因 |
|---|---|---|
| `support_quit`（支持裸辞） | realist | 经济边界 |
| `oppose_quit`（反对裸辞） | action | 健康成本 |
| `depends`（看情况） | action | 条件不齐时的拖延 |

### 第二轮（9 选 1）

| firstChoice \ secondChoice | `leave_now` | `wait_offer` | `set_deadline` |
|---|---|---|---|
| `support_quit` | conditional | action | conditional |
| `oppose_quit` | realist | conditional | conditional |
| `depends` | realist | action | conditional |

详见 `src/agents/director/router.ts` 的 `secondRoundTable`。

## 协作规则

- **不评价用户对错**（3 席位都遵守）
- **避免重复**：director 不会让同一席位连发两次
- **避免信息淹没**：第一轮 director 只让一个席位发，第二轮同样只一个
- **数字模糊**：realist 不能说"3 个月""6 个月"这种精确时长
- **不编造**：禁止编造个人经历、公司、数字、来源
- **sourceIds 必须落在绑定列表内**：hard constraint，详见 `.harness/contracts/discuss.md`

## RAG 房间 Agent（实验性）

P1 阶段扩展：20 房间 demo 中每个房间有一个"房间专属 Agent"（人设来自该答主语料）。实现不在 `src/agents/` 里，而在 `src/lib/rag/pipeline.ts` 的 `buildRoomSystemPrompt()` 函数 — 把答主 excerpt 注入 system prompt，强制 `top[0]` 是该答主语料。详见：

- [`.harness/contracts/answer.md`](../../.harness/contracts/answer.md)
- [`../change-reports/2026-09-12-rooms.md`](../change-reports/2026-09-12-rooms.md)

## 兜底链路

`mode: "fallback"` 出现的场景：

1. `AI_API_KEY` 或 `AI_BASE_URL` 缺失
2. 模型超时（> 30s）
3. 输出无法 `JSON.parse`
4. `Zod` schema 校验失败
5. `sourceIds` 越界

兜底内容在 `src/lib/fallback/`，所有路径必须能产出。CI 跑 `node tests/core-branches.mjs` 验证 27 路径 + 异常。

详见 `.harness/rules/fallback-policy.md`。
