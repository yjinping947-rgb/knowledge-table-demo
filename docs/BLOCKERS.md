# BLOCKERS · 阻塞项追踪

> 项目当前阻塞项 + 加入协作者后该跑什么的清单。
> 每次有阻塞加一条；解决后划掉并写解决时间。

## 当前阻塞

（暂无 — 2026-09-12 push 权限已就绪）

## 已解决

### ✅ [2026-09-12] 没有 GitHub 写权限

**描述**：本地仓库 18 个 commit 领先 `origin/main`，但用户没被加为协作者，没法 `git push`。

**解决**：被加为 collaborator 后，推 `dev-lhq` 分支成功（commit `9901eed`）。

**还差什么**（已经能 push，但更彻底）：
- [ ] 在 GitHub 上提 PR：https://github.com/yjinping947-rgb/knowledge-table-demo/pull/new/dev-lhq
- [ ] CI 跑通后合并到 main
- [ ] 建 4 个 GitHub team（需 org admin）：`node scripts/setup-teams.mjs create` + `add-members`
- [ ] **删除本文件**（解决后删）：`git rm docs/BLOCKERS.md && git commit -m "chore(docs): push 已就绪，删 BLOCKERS"`

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
