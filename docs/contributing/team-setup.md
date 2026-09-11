# GitHub Team 设置指南

> `.github/CODEOWNERS` 里目前用的是占位 team handle（`@MiniMax/<role>-team`），
> 组织里建好对应 team 后，把占位替换成真实 handle 即可。
> 本指南讲怎么建。

## 5 个 team 映射

CODEOWNERS 里的占位 → 真实 team：

| CODEOWNERS 占位 | 含义 | 建议 team 名称 | 维护者 |
|---|---|---|---|
| `@MiniMax/maintainers` | 默认兜底 | `MiniMax/maintainers` | 项目 owner |
| `@MiniMax/director-team` | 导演（业务总编排） | `MiniMax/director-team` | director 负责人 |
| `@MiniMax/action-team` | 行动派 | `MiniMax/action-team` | action 负责人 |
| `@MiniMax/realist-team` | 现实派 | `MiniMax/realist-team` | realist 负责人 |
| `@MiniMax/conditional-team` | 条件派 | `MiniMax/conditional-team` | conditional 负责人 |
| `@MiniMax/user-team` | 用户域 | `MiniMax/user-team` | user 负责人 |

## 步骤

### 1. 在 GitHub 组织里建 6 个 team

GitHub 组织 → Settings → Teams → New team。

对每个 team：

| team 名称 | 描述（建议） | 可见性 |
|---|---|---|
| `maintainers` | Knowledge Table Demo — 默认兜底 reviewer | Visible |
| `director-team` | Knowledge Table Demo — 讨论导演 / 业务编排 reviewer | Visible |
| `action-team` | Knowledge Table Demo — 行动派 reviewer | Visible |
| `realist-team` | Knowledge Table Demo — 现实派 reviewer | Visible |
| `conditional-team` | Knowledge Table Demo — 条件派 reviewer | Visible |
| `user-team` | Knowledge Table Demo — 用户域 reviewer | Visible |

### 2. 加成员

每个 team 加 1-3 个对应负责人：

- `director-team` → 总编排负责人
- `action-team` → 行动派（健康止损立场）负责人
- `realist-team` → 现实派（经济安全立场）负责人
- `conditional-team` → 条件派（条件判断立场）负责人
- `user-team` → 用户域负责人
- `maintainers` → 项目 owner / 治理层维护者（覆盖所有 team 的能力）

### 3. 更新 CODEOWNERS

打开 `.github/CODEOWNERS`，把所有 `@MiniMax/<role>-team` 占位替换成真实 handle：

```bash
# 例如把所有 @MiniMax/ 占位改成 @MiniMax/ 真实 team
sed -i 's|@MiniMax/director-team|@MiniMax/director-team|g' .github/CODEOWNERS
# ... 类似
```

或者直接在 GitHub UI 编辑。

### 4. 验证

提一个测试 PR，改一个 `src/agents/action/index.ts` 的注释：

- 期望：CODEOWNERS 自动加 `@MiniMax/action-team` 为 reviewer
- 期望：CI 跑 `.github/workflows/branch-name.yml` 校验分支名

### 5. 维护

- 负责人变更 → 改对应 team 的成员
- 新增角色 → 在 `.harness/agents/<role>.md` 加契约 + 在 `src/agents/<role>/` 加运行时 + 在 `.harness/INDEX.md` 加映射 + 在 `.github/CODEOWNERS` 加一行 + 在组织里建对应 team
- 删角色 → 上面反向操作

## 跟 `.harness/agents/` 的关系

| `.harness/agents/<role>.md` | GitHub team | 共同维护的目录 |
|---|---|---|
| `director.md` | `director-team` | `app/` `src/agents/director/` `src/client/` `src/lib/` `src/data/` `components/` `tests/` |
| `action.md` | `action-team` | `src/agents/action/` `src/lib/prompts/seats/action.ts` |
| `realist.md` | `realist-team` | `src/agents/realist/` `src/lib/prompts/seats/realist.ts` |
| `conditional.md` | `conditional-team` | `src/agents/conditional/` `src/lib/prompts/seats/conditional.ts` |
| `user.md` | `user-team` | `src/user/` |
| (跨角色) | `maintainers` | `.harness/` `app/globals.css` `app/layout.tsx` `app/page.tsx` `public/assets/` `package.json` `package-lock.json` |

## 参考

- [GitHub Docs — About teams](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams)
- [GitHub Docs — CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [`.harness/agents/`](../../.harness/agents/) — 角色契约
- [`.github/CODEOWNERS`](../../.github/CODEOWNERS) — 当前配置
