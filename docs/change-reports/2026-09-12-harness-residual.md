# 补齐剩余治理层 — /api/answer 契约 + RAG 测试 + lint-staged + 分支校验 + 行为准则

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 作者 | @always |
| 关联 commit | （本次） |
| 影响模块 | `.harness/` `.github/` `docs/` `tests/` `package.json` + 新增 `CHANGELOG.md` `CONTRIBUTING.md` `.dockerignore` |

## 背景

`2f08f38`（chore(harness): 补齐治理层）已经补了基础，但还剩几处治理层缺口：

1. **`/api/answer` 缺 harness 契约** — 只有 change report 描述，没有 `.harness/contracts/answer.md`
2. **RAG 路径缺自动化测试** — 27 路径测试不覆盖 `/api/answer`，每次改 RAG 都要手动验证
3. **pre-commit 慢** — 全量 `npm run lint` 跑遍整个项目，加新代码后越来越慢
4. **分支名无强校验** — commitlint 只校验 message，不校验 PR 源分支名
5. **缺社区治理文件** — 没有 `CODE_OF_CONDUCT.md` / `SECURITY.md` / `CHANGELOG.md` / `CONTRIBUTING.md`
6. **缺团队设置指南** — CODEOWNERS 里 5 个 team handle 是占位，没有怎么建的文档

本次 PR 一次性补齐，按用户要求"按相同规范、不分 commit"。

## 变更前预期

### 用户行为

- 不变 — 纯治理层 + 测试 + 文档
- RAG 房间 demo 行为完全不变（已跑过 8 个 RAG path check）
- 27 路径测试不变

### 数据 / API

- **不**改变 `/api/answer` 任何行为
- 修契约 `contracts/answer.md` 的字段名（`id` → `contentId`）以匹配实现
- 不动 `src/lib/rag/*` 运行时代码

### 兼容性

- `lint-staged` 是新 devDep，需要 `npm install` 装上
- `.harness/hooks/pre-commit.mjs` 从全量 lint 改为 `lint-staged`（只跑已暂存文件），提速明显
- `.github/workflows/ci.yml` 增加 `node tests/rooms-rag.mjs` 步骤（CI 多跑一个测试）
- `.github/workflows/branch-name.yml` 是新 workflow，对 PR 源分支名校验

### Harness 影响

- 治理层从 6 规则 / 4 技能 / 2 契约 → **6 规则 / 4 技能 / 3 契约**
- 协作治理从 0 → **PR 模板 / Issue 模板 / CODEOWNERS / Dependabot / 分支名校验 / 安全 / 行为准则 / CI** 八件套
- 文档从 5 子目录 13 个文件 → **5 子目录 14 个文件**（+ team-setup.md）
- 根目录新增 `CHANGELOG.md` / `CONTRIBUTING.md` / `.dockerignore`

## 改了什么

### 新建

#### Harness 治理

- `.harness/contracts/answer.md` — `/api/answer` 契约（POST + GET + 错误 + 反约束）

#### 协作治理

- `.github/workflows/branch-name.yml` — PR 源分支名格式校验
- `.github/SECURITY.md` — 私密安全上报（不公开 issue）
- `.github/CODE_OF_CONDUCT.md` — 贡献者公约（Contributor Covenant 2.1）

#### 测试

- `tests/rooms-rag.mjs` — 8 个 RAG 路径检查：rooms list / single room / 404 / question / roomId / 400 / type error / invalid roomId

#### 文档

- `docs/contributing/team-setup.md` — 5 角色 team 怎么建 + 怎么维护
- `CHANGELOG.md` — 7 个版本（0.1.0 → 1.1.0）的变更日志
- `CONTRIBUTING.md` — 根目录的贡献指南（指向 `docs/`）
- `.dockerignore` — 未来 Docker 镜像排除路径

### 修改

- `.harness/INDEX.md` — 契约列表加 `answer.md`，钩子说明加 `lint-staged`
- `.harness/hooks/pre-commit.mjs` — 从全量 lint 改为 `lint-staged`（只跑已暂存文件）
- `.github/workflows/ci.yml` — 加 `node tests/rooms-rag.mjs` 步骤
- `docs/architecture/overview.md` — 加 RAG 段落、加 API 路由表
- `docs/architecture/agents.md` — 加 RAG 房间 Agent 实验性小节
- `package.json` — 加 `lint-staged` devDep + `lint:fix` / `typecheck` / `test:core` / `test:rag` / `test:all` 脚本 + `lint-staged` 配置

## 变更后端测效果

### 自动化测试

- `npm install`：52 packages added（含 lint-staged 15.5.2 + 依赖），3s 完成
- `npm run lint`：0 warning（通过）
- `npm run build`：TypeScript 2.2s + Next 16.3.4 build 651ms 通过
- `node tests/core-branches.mjs`：**PASS: 3 first-round branches, 9 combined branches, 27 summaries, source constraints, length limits, invalid input**
- `node tests/rooms-rag.mjs`：**PASS: 8 RAG path checks**（rooms list / single room / 404 / question / roomId / 400 / type error / invalid roomId）
- `npx tsc --noEmit`：0 error（typecheck 脚本可用）
- `npx lint-staged --version`：15.5.2

### 手动验证

- RAG 路径 8 个 check 全过，覆盖 200/400/404 各场景
- ai 模式：4 个 retrieved，top[0] 是该答主语料
- fallback 模式：缺 key 时也正常（不抛错）
- 27 路径测试结果与重构前完全一致

### 边界 / 异常

- `/api/answer` 缺 question → 400 + `{ error: "缺少 question 字段" }`
- `/api/answer` question 类型错 → 400
- `/api/answer` roomId 不存在 → 200 + 提示"房间不存在"
- lint-staged 跨平台：Windows / macOS / Linux 都能跑（与 husky 钩子风格一致）
- 不动 frozen 资源（`app/globals.css` / `app/layout.tsx` / `app/page.tsx` / `public/assets/`）

## 风险 / 回滚

- **风险点**：lint-staged 是新 devDep，团队里其他人需要重新 `npm install`
- **风险点**：`pre-commit.mjs` 行为从全量 lint 改为 lint-staged，老 hook 用户可能感知不到变化（这是优点）
- **风险点**：`branch-name.yml` 对 PR 源分支名校验可能"误杀"——比如 `feature/xxx` 用 `feature` 而不是 `feat`。但 CI 失败会提示怎么改
- **风险点**：`CODE_OF_CONDUCT.md` 留了一个占位 `<暂未设置 — 启用时填>` 的联系方式，需补
- **回滚方式**：`git revert <commit-hash>` — 治理层不影响运行时，回滚后应用功能完全不变
- **回滚后状态**：恢复 1.1.0 之前（不含 /api/answer 契约 / RAG 测试 / lint-staged / 分支校验）

## 后续 TODO

- [ ] 建 5 个 GitHub team，替换 CODEOWNERS 占位（按 `docs/contributing/team-setup.md`）
- [ ] `/api/answer` 加 Zod 校验（`src/lib/validators/answer.ts`）
- [ ] `/api/answer` 加 fallback 内容（`src/lib/fallback/answer.ts`）
- [ ] CODE_OF_CONDUCT.md 留的联系方式占位
- [ ] 后续重大变更按 `.harness/skills/write-change-report.md` 写 change report
- [ ] 后续 PR 按 `.github/PULL_REQUEST_TEMPLATE.md` 写"变更前预期"和"变更后端测效果"
- [ ] 后续 issue 按 `.github/ISSUE_TEMPLATE/{bug,feature}.md` 提

## 事后回顾（预留）

待 PR review / 合并后补。

## 跟上次 commit 的关系

- 上次 `2f08f38` 补了"基础治理层"（user 域 + 模板 + 文档）
- 本次补"剩余治理层"（/api/answer 契约 + RAG 测试 + lint-staged + 分支校验 + 行为准则 + CHANGELOG）
- 合起来构成"完整治理层"（1.1.0）
- 下次（1.2.0）应该是功能性变更（加新功能 / 修 bug），不再是治理层
