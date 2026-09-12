# 优化 4 skill（实战发现）

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 时间戳 | 11-45 |
| 作者 | @always |

## 变更前预期

- 用户行为：不变（skill 是给 agent 用的，用户不直接看）
- 数据 / API：不变
- 兼容性：完全兼容（只往 skill 里加章节）
- 性能 / 安全：N/A

## 改了什么

- `.harness/skills/add-corpus.md`：加 "Step 2.5: 选样本数量" 章节（minimal 9 条 vs 生产 60 条）
- `.harness/skills/request-from-teammate.md`：加 "Step 4.5: 选 workflow 模式" 章节（Multi-PR / Single-PR / Issue first）
- `.harness/skills/commit-with-rationale.md`：加 "Step 1.5: 选报告模式" 章节（Full / Minimal）
- `.harness/skills/deploy-app.md`：加 "一键全检查" 章节（`npm run check:all`）
- `package.json`：加 `check:all` 脚本（lint + typecheck + build 一键跑）
- `app/api/seasons/route.ts`：去掉 `any` 类型，用 `Season` / `SeasonLimitedCard` 严格类型

## 变更后端测效果

- `npm run check:all`：lint ✓ + typecheck ✓ + build ✓（4.2s）通过
- 13 problems 修到 7 warnings（都是用户 commit 引入，与本 PR 无关）
- 4 skill 章节加完，每章节有对照表 + 实战经验

## 风险 / 回滚

- 风险：低（只加 skill 文档章节 + 加 npm script + 改 1 个文件用 `any` → 类型）
- 回滚：`git revert <commit-hash>` — 治理层变更不影响运行时

Refs docs/change-reports/2026-09-12-1140-multi-season-foundation.md（本次优化的源）
