# BLOCKERS · 阻塞项追踪

> 项目当前阻塞项 + 加入协作者后该跑什么的清单。
> 每次有阻塞加一条；解决后划掉并写解决时间。

## 当前阻塞

### 🔴 [2026-09-12] 没有 GitHub 写权限

**描述**：本地仓库 13 个 commit 领先 `origin/main`，但用户没被加为协作者，没法 `git push`。

**影响**：
- 代码改完没法推到远端
- PR / Review / Team setup 都没法在 GitHub 上做
- 团队成员没法看到最新代码

**解除条件**：被加为 GitHub 仓库 collaborator（Settings → Collaborators → Add people）。

**解决后该跑的命令**（按顺序）：

```bash
# 1. 推送本地所有 commit
git push origin main
# 如果有冲突：git pull --rebase origin main

# 2. 验证 CI 跑通
# GitHub 网页 → Actions tab → 看 ci.yml 是否全绿

# 3. 建 4 个 GitHub team（需要 org admin）
node scripts/setup-teams.mjs create
node scripts/setup-teams.mjs add-members your-github-handle

# 4. 验证 CODEOWNERS reviewer 路由
# 提一个测试 PR 改 src/data/topics.json → 应该自动 assign @MiniMax/corpus

# 5. 删除本文件
git rm docs/BLOCKERS.md
git commit -m "chore(docs): 协作权限已就绪，删除 BLOCKERS"
```

**降级方案（如果没法马上加协作者）**：

| 想做的事 | 没协作者时怎么办 |
|---|---|
| 推送代码 | 找 owner push，或用 patch / bundle 发给 owner |
| PR review | 用 `node scripts/setup-teams.mjs single-user your-handle` 改成单人 owner 模式（不用 admin）|
| team setup | 跳过——CODEOWNERS 自动 fallback 到 maintainers（暂未生效，但 PR 流程仍能跑）|
| 多人协作 | 等加完协作者再说 |

## 已解决

（暂无）

## 模板（新增阻塞时复制）

```markdown
### [YYYY-MM-DD] 一句话描述

**描述**：详细情况
**影响**：影响范围
**解除条件**：怎么解除
**解决后该跑的命令**：
```bash
# 命令
```
**降级方案**：短期绕过
```

## 相关

- 协作者申请：[GitHub Docs](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository)
- 推送指南：[`development/setup.md`](./development/setup.md)
- CODEOWNERS：[`../../.github/CODEOWNERS`](../../.github/CODEOWNERS)
- 4 team 路由：[`contributing/team-setup.md`](./contributing/team-setup.md)
