# 分支规范

> 与 `.harness/rules/branch-policy.md` 同步。本文档给开发者看，那份给"agent"看。

## 命名格式

```
<type>/<scope>-<short-desc>
```

- `type`：`feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `style` / `perf` / `ci` / `revert`（同 commit-policy.md）
- `scope`：变更主要目录或角色
  - 模块级：`harness` / `agents` / `client` / `lib` / `api` / `docs` / `tests` / `ci` / `deps` / `user` / `data`
  - 角色级：`director` / `action` / `realist` / `conditional`
- `short-desc`：kebab-case，30 字以内，动词开头

## 示例

| 分支 | 用途 | 对应 commit |
|---|---|---|
| `feat/harness-add-pr-template` | 加 PR 模板 | `chore(harness): 补齐治理层 — PR 模板 + ...` |
| `fix/director-router-fallback` | 修 director 路由 fallback 漏判 | `fix(director): 补全 router 9 路径 fallback` |
| `refactor/client-split-stages` | 重构客户端 stage 拆分 | `refactor(client): 拆 stage 与原子组件` |
| `docs/architecture-overview` | 写架构概览 | `docs(architecture): 加 overview 与 agents 文档` |
| `chore/deps-bump-next-16` | 升级 next 到 16 | `chore(deps): bump next 16.3.4` |
| `test/core-branches-30-paths` | 扩 27 路径到 30 | `test(tests): 27 → 30 路径回归` |
| `feat/action-seat-casual-tone` | 调整行动派语气 | `feat(action): 调整 seat 语气为更自然` |

## 常驻分支

| 分支 | 用途 | 保护 |
|---|---|---|
| `main` | 主分支，受保护，必须 PR | 不允许直推 / 强推 |
| `develop` | （未启用 — 单 demo 不需要） | — |

## 不允许

- 直接在 `main` 上 commit（必须 PR）
- 名字带空格 / 大写 / 下划线 / 中文
- `type` 用 `feature` / `bug` / `wip` 之类不在 commit-policy.md 列表里的
- 名字超过 60 字符
- 分支名以 `release/` 开头 —— 本项目用 `main` + 标签，不用 release branch

## 工具

- CI 当前不强制校验分支名（commitlint 也只校验 message，不校验分支名）
- 本地自检：

```bash
git branch --show-current
```

- 跟 commit 同步：`branch type` = `commit type`

## 与 commit 的关系

| 维度 | 分支 | commit |
|---|---|---|
| 范围 | 一个 PR / 一个变更主题 | 一个原子步骤 |
| type 列表 | 同 commit | 同 commit |
| scope | 主题级（`harness` / `client`） | 步骤级（`harness` / `agents`） |
| subject | 描述 | 30 字内的本次动作 |
| 历史 | merge 后保留 30 天可读 | 永久保留 |

一个 PR 经常对应一个分支 + 多个 commit。比如：

```
分支：feat/harness-add-pr-template
  commit 1: chore(harness): 加 PR 模板与 Issue 模板
  commit 2: chore(harness): 加 CODEOWNERS 与 Dependabot
  commit 3: docs(contributing): 写 how-to-pr 文档
```
