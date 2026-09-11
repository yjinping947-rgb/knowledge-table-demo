# 提交规范

## Conventional Commits

每条 commit 必须符合：

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

`harness` / `agents` / `client` / `lib` / `api` / `docs` / `tests` / `ci` / `deps`

scope 应与变更主要目录对应。

## subject 规则

- 中文，30 字以内
- 不以句号结尾
- 不写"修改了XX"这种废话
- 用动词开头（新增、修复、调整、提取、拆分）

## body 规则

- 解释"为什么"而非"做了什么"
- 复杂变更说明风险与影响
- 引用相关 issue / 文件路径

## 工具

- `commitlint` 校验格式（`@commitlint/config-conventional`）
- `husky` 触发 `commit-msg` 钩子
- `pre-commit` 钩子跑 `npm run lint` 和 `npm run test`

## 配置文件

- `.commitlintrc.json` — commitlint 配置
- `.husky/pre-commit` — pre-commit 钩子
- `.husky/commit-msg` — commit-msg 钩子
- `.harness/hooks/` — 钩子脚本（被 husky 调用）

## 历史 commit

- husky 只对新提交生效
- 旧 commit 不会被 commitlint 拦截
- 如需修复历史，用 `git rebase -i` + `--no-verify`
