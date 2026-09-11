# UI 不变性

> 改 `src/client/`、`components/`、`app/globals.css` 之前必读。

## 强约束

拆分前端组件时，**55 个 CSS class 全部保留**（与 `app/globals.css` 保持一一对应）：

```
assumption, blue, brand, choices, consensus, dark, demo-badge,
disagreement, done, duration, eyebrow, green, hero, hero-copy,
hero-image, host-copy, host-strip, host-summary, loading, map-card,
map-grid, map-stamp, mock-note, mode-line, muted, on, open, primary,
progress, red, reply, result-actions, result-body, result-hero,
result-page, result-title, seat-card, seat-grid, seat-head, seat-mark,
section-title, source-chips, source-list, sources, speaking,
speaking-label, stance, subtitle, table-area, topbar, track,
trajectory, user-label, user-seat, wordmark
```

提取方法（PowerShell）：

```powershell
[regex]::Matches((Get-Content app\globals.css -Raw), '\.([a-zA-Z][\w-]*)') |
  ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
```

## 允许的变更

- DOM 嵌套层级调整（只要 CSS 选择器命中）
- 组件拆分（不改变视觉）
- 状态管理重构（不改变交互行为，比如 `useState` → `useReducer`）
- 样式按 class 选择器命中（不允许新加 className 但允许用现有 className 组合）

## 不允许的变更

- 删 / 改 / 重命名任何 className
- 改 `app/globals.css`（冻结）
- 改 `app/layout.tsx`（冻结）
- 改 `app/page.tsx`（冻结）
- 改 `public/assets/`（冻结）
- 改变 stage 数量（必须保持 8 个）：
  `home` / `intro` / `round1-choice` / `round1-response` / `round2-choice` / `round2-response` / `reflection` / `result`

## 验证

```powershell
# 拆分前后 className 列表必须完全一致
Select-String -Path components\KnowledgeTable.tsx, src\client\knowledge-table -Pattern 'className="([^"]+)"' -AllMatches -Recurse |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Value } | Sort-Object -Unique
```

## 拆分原则

- 抽出"原子组件"（SeatCard / UserSeat / HostStrip / ProgressBar / Sources / MapCard）
- 抽出"stage 组件"（HomeStage / IntroStage / ChoiceStage / ResponseStage / ResultStage）
- 状态机独立成 `state.ts`，主组件薄壳只做 stage 分发
- 所有 props 显式标注类型，禁止 `any`
- 复用：ChoiceStage 处理第一轮 / 第二轮 / 反思三处选择；ResponseStage 处理两轮回应
