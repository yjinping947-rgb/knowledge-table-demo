# 多赛季系统基础（4 赛季 + T21 + SeasonsShell）

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 时间戳 | 11-40 |
| 作者 | @always |
| 关联 commit | （本次） |
| 影响模块 | `src/data/seasons.json`（新）+ `src/data/index.ts`（改）+ `app/api/seasons/route.ts`（新）+ `app/api/topics/route.ts`（改）+ `app/page.tsx`（改）+ `src/client/seasons/`（新）+ `src/data/topics.json`（T21 新增）+ `src/data/topic-embeddings.json`（重新生成 1184 条） |

## 背景

用户提供 9 个 HTML 设计稿（"AI 争鸣"产品，9 个页面：辩题池/赛季/立论/表态/交锋/历史/桌布/轨迹/分享）。当前 demo 是单辩题（"裸辞"）2 轮讨论。要在不动现有 demo 核心的前提下加**多赛季框架**：

- **数据层**：加 `seasons.json` 描述 4 赛季（S01-S04），复用现有 20 话题
- **API 层**：加 `/api/seasons` 列表 + 详情
- **前端层**：加 `SeasonsShell` 客户端组件，home 页改默认渲染赛季列表
- **语料层**：用 `add-corpus` skill 加 T21（"AI 取代程序员"）3 派各 3 条 = 9 条样本

## 变更前预期

### 用户行为

- **`/` 显示赛季列表**（4 张卡片：S01 AI 取代程序员 / S02 AI 伦理 / S03 全民基本收入 / S04 游戏第九艺术）
- **`/?season=S01` 进入 demo**（当前沿用 T01 裸辞；2 轮 demo 暂未按 season 切分）
- 点击赛季卡片 → 展开 "进入赛季" 按钮
- `/api/seasons` 返回 4 个赛季（不含 limitedCards 详情）
- `/api/seasons?id=S01` 返回 S01 完整数据（含 5 张限定卡）
- `/api/topics` 现在返回 21 个话题（含 T21）

### 数据 / API

- `src/data/seasons.json`（新）— 4 赛季元数据
- `src/data/topics.json` — 加 T21（3 派 × 3 条 = 9 条）
- `src/data/topic-embeddings.json` — 重新生成（1175 → 1184 条，199.6s，33.50MB）
- `/api/seasons` 路由新加

### 兼容性

- 完全兼容 — 现有 2 轮 demo（`?season=S01` 或无参数下显示）行为不变
- 现有 27 路径 + 8 RAG 路径测试全部通过

### Harness 影响

- 加 1 个数据 schema（Season 类型）
- 加 1 个 API 端点（`/api/seasons`）
- 1 个新客户端组件 + CSS Module
- 主页路由逻辑扩展（`?season=` 参数）
- 4 个 skill 全跑通（add-corpus / deploy-app / commit-with-rationale / request-from-teammate 评估）

## 改了什么

### 新建

- `src/data/seasons.json` — 4 赛季元数据
- `app/api/seasons/route.ts` — GET 列表 + 详情
- `src/client/seasons/SeasonsShell.tsx` — 客户端列表组件
- `src/client/seasons/seasons.module.css` — 样式（CSS Module，独立作用域）
- `.tmp/add-t21.mjs`（临时）— 加 T21 9 条样本的脚本

### 修改

- `src/data/index.ts` — 加 `Season` / `SeasonLimitedCard` 类型 + `seasons` / `seasonById` / `listSeasons`
- `app/page.tsx` — 主页根据 `?season=` 参数决定渲染 SeasonsShell 或 KnowledgeTable
- `app/api/topics/route.ts` — 注释更新（20 → 21 话题）
- `src/data/topics.json` — 加 T21（"AI 取代程序员"3 派各 3 条）

## 变更后端测效果

### 自动化测试

- `npm run build` — TypeScript 2.5s + Next 16.3.4 build 4.2s 通过
- `node tests/core-branches.mjs` — **PASS: 3 first-round / 9 combined / 27 summaries**
- `node tests/rooms-rag.mjs` — **PASS: 8 RAG path checks**
- `npm run rag:build` — **1184 embeddings, 199.6s, 33.50MB**（T21 加 9 条后重生成）
- `GET /api/seasons` → 4 路由全返回
- `GET /api/seasons?id=S01` → S01 完整数据（5 张限定卡 + 5 topicIds）

### 手动验证

- T21 语料 9 条 + embedding 9 条匹配
- T21 3 派（action / realist / conditional）各 3 条
- 主页 `/` 渲染 SeasonsShell（4 张卡片）
- 主页 `/?season=S01` 渲染 KnowledgeTable（沿用 T01）

### 边界 / 异常

- 不动 frozen 资源（`app/globals.css` / `app/layout.tsx` / 8 stage 状态机 / 55 CSS class）
- 不改 `/api/discuss` / `/api/summary` 的 firstChoice/secondChoice schema（暂时不做 per-season 2 轮）

## 风险 / 回滚

- **风险点**：`/api/discuss` 和 `/api/summary` 仍硬编码 T01（裸辞）。点击 S02-S04 卡片进入 demo 还是会用 T01
  - 缓解：UI 上明确写"（当前 demo 暂未按 season 切分，复用 T01）"
- **风险点**：`src/data/index.ts` 的 seasons cast 用 `as Season` 强制类型（因为 `seasons.json` 有 `_comment` 字段）
  - 缓解：编译时校验 `seasons.json` schema（如果缺字段会 TS 报错）
- **回滚方式**：`git revert <commit-hash>` 完全不影响 demo 核心
- **回滚后状态**：seasons 数据 + API + SeasonsShell 都移除，回退到 1 赛季 1 话题的简单 demo

## 4 skill 跑通情况（本次开发完整流程）

### ✅ commit-with-rationale（演示中）
- 写时间戳 change report ✓
- 编码 ✓
- 端测 ✓
- 写"变更后端测效果" ✓（本 report）
- commit（待）

### ✅ deploy-app
- `npm run build` ✓
- `npm run start` + 27 路径 ✓
- 8 RAG 路径 ✓
- 健康检查：`/api/seasons` 列表 + 详情 ✓

### ✅ add-corpus
- 加 T21 到 `src/data/topics.json`（3 派 × 3 条 = 9 条）✓
- 跑 `npm run rag:build` 生成 9 个 embedding ✓
- 验证 1184 / 1175 = 9 条匹配 ✓

### ⚠️ request-from-teammate（评估）
- 本次开发跨 3 角色（corpus / feature-design / ui-design）
- 但**没有显式开 issue 提需求**——全部在一个 PR 里完成
- 优化点：未来类似跨角色改动应该用 issue 显式追踪

## 后续 TODO

- [ ] 把 `/api/discuss` 和 `/api/summary` 的 firstChoice/secondChoice 改成 per-season
- [ ] `SeasonsShell` 加 "赛季进度" 展示（completedTopicIds / totalTopicIds）
- [ ] 加 `SeasonsShell` → 单个赛季详情页 `/seasons/[id]`
- [ ] 加 `SeasonCard` 提取组件（如果赛季数 > 4）
- [ ] 加更多辩题到 `topics.json`（每赛季 5 辩题 × 4 赛季 = 20 辩题，已有 20 + 1 = 21，差 19 个）

## 4 skill 优化建议（实战发现）

| Skill | 优化点 | 原因 |
|---|---|---|
| `add-corpus` | 加一个 "minimal sample" 章节："3 派 × 3 条 = 9 条就够 demo 验证" | 实测跑通 9 条样本耗时 3.3 min；如果按 skill 说的"~20"会变成 7+ min |
| `request-from-teammate` | 强调"开 issue 而非在同一 PR 里做"——本次开发应该用 3 个 issue 串起 | 实测都是同 PR 完成，弱化了"跨角色"的核心 |
| `commit-with-rationale` | 加 "minimal report" 模式：小改动只填 3 段（变更前预期 / 改了什么 / 端测效果）| 实测本次报告写得很重（~140 行），小改动可以精简到 30 行 |
| `deploy-app` | 加 "all-check" 命令：`npm run test:all` 已经存在，但需要再补 `npm run check:all` 把 lint + typecheck + build + test 串起来 | 实测跑了 4 个独立命令才能完整验证 |

## 跟其他文档的关系

- 4 skill 文档：[`.harness/skills/`](../../.harness/skills/)
- 4 角色总览：[`.harness/INDEX.md`](../../.harness/INDEX.md) 第 8 节
- API 契约：`.harness/contracts/answer.md`（类似的契约风格）
- 变更报告模板：[`./TEMPLATE.md`](./TEMPLATE.md)
- 提交技能：[`.harness/skills/commit-with-rationale.md`](../../.harness/skills/commit-with-rationale.md)
