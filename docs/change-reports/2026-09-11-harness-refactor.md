# 拆分目录与搭建治理层

> 追溯性变更报告 — commit `30a16a5` 当时的"预期 vs 实际"在事后整理。

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-11 |
| 作者 | @always |
| 关联 commit | `30a16a5` |
| 影响模块 | `app/` `src/` `components/` `lib/` → `src/{user,data,agents,client,lib}` + `.harness/` |
| 影响契约 | 新增 `.harness/{agents,rules,skills,contracts,hooks,evals}/` |

## 背景

P0 阶段项目是"单体 Next.js"：所有代码平铺在 `lib/` `components/` `app/`，没有任何治理层。要开始加 RAG / 多 agent / fallback 链路之前，先把目录结构和治理层搭好。

## 变更前预期

### 用户行为

- 不变 — 这是纯工程重构，对外行为 0 变化
- 27 路径测试结果应与重构前完全一致

### 数据 / API

- API 入参 / 出参不变（contract 维持 discuss + summary）
- 数据从 `data/` 移到 `src/data/`，JSON 内容不变

### 兼容性

- 不破坏向后兼容 — 没有外部用户
- 旧 `lib/` 全部删掉，没有任何 import 残留

### Harness 影响

- 引入 `.harness/` 治理层
- 5 角色双轨：`.harness/agents/*.md` + `src/agents/*/`
- 5 规则 / 3 技能 / 2 契约 / 2 钩子 / 1 评测
- commitlint + husky + GitHub Actions
- AGENTS.md 头部声明符合 agents.md 规范

## 改了什么

按目录列：

- **新建** `src/agents/{director,action,realist,conditional}/` — 4 个角色运行时（index.ts + prompt.ts / router.ts）
- **新建** `src/client/knowledge-table/` — 主 demo 前端（state + 5 stages + 6 原子组件）
- **新建** `src/data/` — 6 个 JSON + 类型化导出
- **新建** `src/lib/{ai,fallback,prompts,rag,validators,types.ts}` — 基础设施
- **新建** `.harness/` — 治理层（5 角色 + 5 规则 + 3 技能 + 2 契约 + 2 钩子 + 1 评测）
- **新建** `.github/workflows/ci.yml` + `.husky/{pre-commit,commit-msg}` + `.commitlintrc.json`
- **删除** `lib/ai.ts` `lib/fallback.ts` `lib/prompts.ts` `lib/validators.ts`（合并到 `src/lib/`）
- **迁移** `data/{seats,sources,topic}.json` → `src/data/`（内容不变）
- **重写** `app/api/{discuss,summary}/route.ts` 改用 `@/lib/...` 别名
- **重写** `components/KnowledgeTable.tsx` 为薄壳 re-export
- **重写** `README.md` 把目录结构、harness 说明、git 工作流、CI 全部写清

## 变更后端测效果

### 自动化测试

- `npm run lint`：通过
- `npm run build`：通过
- `node tests/core-branches.mjs`：PASS: 3 first-round branches, 9 combined branches, 27 summaries, source constraints, length limits, invalid input

### 手动验证

- 27 路径全部能跑（firstChoice × secondChoice × positionChange = 3 × 3 × 3 = 27）
- 缺 `AI_API_KEY` 时自动 fallback，response 里有 `mode: "fallback"`
- 传非法输入返回 400
- UI 55 个 CSS class 全部保留
- stage 状态机保持 8 个

### 边界 / 异常

- AI 调用超时：fallback
- 解析失败：fallback
- sourceIds 越界：fallback
- 跨平台：Windows + macOS + Linux 都能跑（钩子是 .mjs 不是 .sh）

## 风险 / 回滚

- **风险点**：旧的 `lib/` 全部删除，依赖路径变化大；任何 `import "@/lib/..."` 没改完的会断
- **回滚方式**：`git revert 30a16a5`
- **回滚后状态**：恢复 P0 的"单体 Next.js"结构

## 后续 TODO

- [ ] `src/user/` 域实现（user.md 已声明但当时没建）— 在 `2026-09-12` 的 "chore(harness): 补齐治理层" 提交里补
- [ ] UI 不变性规则的 PowerShell 验证命令改写成跨平台 Node 脚本
- [ ] 27 路径测试在 CI 中跑（已有 `.github/workflows/ci.yml`）

## 事后回顾

完成得不错，但 **`src/user/` 留了空目录** — 当天没补完。这是个文档与实现脱节的典型例子。后续在 `chore(harness): 补齐治理层` 里把 `UserSession` / `Trajectory` 类型补进 `src/user/types.ts`，并加 `selectUserSession` 选择器。
