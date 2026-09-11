---
name: ui-design
role: human-team
display_name: UI 设计
team_members: []
---

# UI 设计 · ui-design

## 职责

负责 React 客户端组件、state machine、stages、原子组件、55 个 CSS class 不变性、8 个 stage 状态机。

## owner 目录

```
src/client/              # React 客户端（knowledge-table + rooms + rooms-app）
components/              # 薄壳 re-export
app/page.tsx             # 根首页（**冻结**）
app/layout.tsx           # 根布局（**冻结**）
app/globals.css          # 55 个 CSS class（**冻结**）
public/assets/           # 静态资源（**冻结**）
```

## owner 文件

- `src/client/knowledge-table/{stages,components,state.ts,index.tsx}` — 主 demo
- `src/client/rooms/{RoomGrid,RoomDetail,index,rooms.module.css}` — 20 房间
- `src/client/rooms-app/index.tsx` — 房间应用入口
- `components/KnowledgeTable.tsx` — 薄壳 re-export

## 不变性约束（强）

- **55 个 CSS class 全部保留**（详见 `.harness/rules/ui-invariance.md`）
- **8 个 stage 状态机**：`home` / `intro` / `round1-choice` / `round1-response` / `round2-choice` / `round2-response` / `reflection` / `result`
- **frozen 资源**（改前必读 ui-invariance.md，必须在 PR 描述里 justify + @maintainers）：
  - `app/globals.css`
  - `app/layout.tsx`
  - `app/page.tsx`
  - `public/assets/`

## 协作场景

- **拆 stage 组件**：从 `KnowledgeTable` 抽 5 stages + 6 原子组件（`HomeStage` / `IntroStage` / `ChoiceStage` / `ResponseStage` / `ResultStage` / `SeatCard` / `UserSeat` / `HostStrip` / `ProgressBar` / `Sources` / `MapCard`）
- **加新交互**：新 stage 必先在 `.harness/INDEX.md` 第 1 节"模块 → owner"确认 owner，再改 state.ts
- **响应式 / 主题**：当前不支持，需要新设计系统（**frozen** 范围内不允许）

## 需要 review 的别人改动

- **agent-dev** 改 `src/lib/ai/` 或 `src/lib/prompts/` — 不直接影响 UI，但 reply / hostComment 改了组件要更新
- **feature-design** 改 API 路由响应结构 — 前端 fetch 的 schema 变了要跟着改
- **corpus** 加新语料 — 改了 RAG 响应（`sourceIds` / `sourceUrls` / `authors`）组件要适配

## 给别人提需求

- **→ agent-dev**：UI 需要显示的新数据（不在当前 agent 输出里）
- **→ feature-design**：前端需要的 API 字段不在响应里
- **→ corpus**：新语料的展示样式需求（如按 topic 分组、按 voteUpCount 排序）

## 关键约束

- DOM 嵌套层级可调（只要 CSS 选择器命中），不改变视觉
- 组件拆分（不改变视觉），state 重构（不改变交互）
- 样式按现有 class 组合（不允许新增 className）
- 任何"看起来不变"的视觉改动必跑 55 class 验证

## 配套 skill

- [`commit-with-rationale`](../skills/commit-with-rationale.md) — 提交
- [`request-from-teammate`](../skills/request-from-teammate.md) — 跨角色协作
