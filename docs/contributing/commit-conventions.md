# commit message 规范

> 与 `.harness/rules/commit-policy.md` 同步。本文件给开发者看，那份给"agent"看。

## 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

## type 列表

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修 bug |
| `refactor` | 重构（不改行为） |
| `test` | 测试相关 |
| `docs` | 文档 |
| `chore` | 构建 / 工具 / 依赖 |
| `style` | 格式（不改逻辑） |
| `perf` | 性能 |
| `ci` | CI 相关 |
| `revert` | 回退 |

## scope 建议

按变更主要目录对应：

`harness` / `agents` / `client` / `lib` / `api` / `docs` / `tests` / `ci` / `deps` / `user` / `data` / `director` / `action` / `realist` / `conditional`

## subject 规则

- 中文，30 字以内
- 不以句号结尾
- 不写"修改了XX"这种废话
- 动词开头（新增、修复、调整、提取、拆分）

## body 规则

- 解释"为什么"而非"做了什么"
- 复杂变更说明风险与影响
- 引用相关 issue / 文件路径
- 引用 `docs/change-reports/<date>-<slug>.md`（如适用）

## footer 规则

- `Fixes #<number>`（关闭 issue）
- `Refs #<number>`（关联但不关闭）
- `BREAKING CHANGE: <说明>`（破坏性变更）

## 示例

### 好的 commit

```
feat(action): 加第二论据的引用示例

之前 action 的 reply 偶尔只引用 1 条 source，不够有说服力。
现在从 S01-S03 中强制选 2 条，body 引用带"详见 S0X"字样。

Refs docs/change-reports/2026-09-12-action-evidence.md
```

### 不好的 commit

```
修改了一些东西
```

```
feat(action): 修改
```

```
feat(action): 修改了行动派的回复让其更完善
```

### 一次性 commit（本次）示例

```
chore(harness): 补齐治理层 — user 域 + 模板 + 文档

- 修 src/user/ 空目录：加 UserSession / Trajectory 类型
- 加 .github/PULL_REQUEST_TEMPLATE.md（含变更前预期 / 变更后端测）
- 加 .github/ISSUE_TEMPLATE/{bug,feature}.md + config.yml
- 加 .github/CODEOWNERS（5 角色 reviewer 路由）
- 加 .github/dependabot.yml（next/react/zod 升级）
- 加 .harness/rules/branch-policy.md
- 加 .harness/skills/write-change-report.md
- 加 docs/ 目录：architecture / development / deployment / change-reports / contributing
- 加 .nvmrc / .editorconfig
- 更新 AGENTS.md / INDEX.md / README.md 指向 docs/

Refs docs/change-reports/2026-09-12-harness-finalize.md
```

## 工具

- `commitlint` 校验格式（`@commitlint/config-conventional`）
- `husky` 触发 `commit-msg` 钩子
- `pre-commit` 钩子跑 `npm run lint` 和 `npm test`
- 所有钩子脚本在 `.harness/hooks/*.mjs`，跨平台

## 历史 commit

- husky 只对新提交生效
- 旧 commit 不会被 commitlint 拦截
- 如需修复历史，用 `git rebase -i` + `--no-verify`

## 一图速览

```
<type>(<scope>): <subject>
   │       │          │
   │       │          └─ 30 字内，动词开头，不带句号
   │       └─ 跟变更主要目录对应
   └─ 10 个里选一个
```
