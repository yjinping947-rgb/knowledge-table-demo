# 分支规范

## 命名格式

```
<type>/<scope>-<short-desc>
```

- `type` 必填，参考 `.harness/rules/commit-policy.md` 的 type 列表
- `scope` 必填，对应变更主要目录（`harness` / `agents` / `client` / `lib` / `api` / `docs` / `tests` / `ci` / `deps` / `user` / `data` / `director` / `action` / `realist` / `conditional`）
- `short-desc` 必填，kebab-case，不超过 30 字，动词开头
- 例外：`main` / `develop` 是常驻分支，不受此规范约束

## 示例

| 分支名 | 用途 |
|---|---|
| `feat/harness-add-pr-template` | 加 PR 模板 |
| `fix/director-router-fallback` | 修 director 路由 fallback |
| `refactor/client-split-stages` | 重构客户端 stage 拆分 |
| `docs/architecture-overview` | 写架构概览 |
| `chore/deps-bump-next-16` | 升级 next 到 16 |
| `test/core-branches-30-paths` | 扩 27 路径到 30 |
| `feat/action-seat-casual-tone` | 调整行动派语气 |

## 不允许

- 直接在 `main` 上 commit（用 PR）
- 名字带空格、大写、下划线
- `type` 用 `feature` / `bug` / `wip` 之类不在 commit-policy.md 列表里的
- 名字超过 60 字符

## 工具

- `husky` 不强制（commit-msg 钩子只校验 message，不校验分支名）
- 建议：CI 加一个轻量 workflow，对 PR 源分支名校验
- 本地用 `git branch --show-current` + `git symbolic-ref --short HEAD` 自检

## 跟 commit 的关系

| 维度 | 分支 | commit |
|---|---|---|
| 范围 | 一个 PR / 一个变更主题 | 一个原子步骤 |
| type 列表 | 同 commit | 同 commit |
| scope | 主题级（`harness` / `client`） | 步骤级（`harness` / `agents`） |
| subject | 描述 | 30 字内的本次动作 |
| 历史 | merge 后保留 30 天可读 | 永久保留 |
