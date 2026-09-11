# 怎么提 PR

> 对应 `.github/PULL_REQUEST_TEMPLATE.md`。本文件讲"流程"，模板讲"格式"。

## 1. 准备工作

- [ ] 你已读完 [`../architecture/overview.md`](../architecture/overview.md)
- [ ] 你已读完 [`../architecture/agents.md`](../architecture/agents.md)
- [ ] 你已读过对应模块的 `.harness/agents/<role>.md` 或 `.harness/rules/<rule>.md`
- [ ] 你的分支符合 [`../development/branching.md`](../development/branching.md)
- [ ] 你已写好"变更前预期"（哪怕只 3 行）

## 2. 提 PR 步骤

```bash
# 1. 拉新分支
git checkout main
git pull
git checkout -b feat/<scope>-<short-desc>

# 2. 改代码 + commit
git add <files>
git commit -m "<type>(<scope>): <subject>"

# 3. 推 + 提 PR
git push -u origin <branch>
gh pr create --fill  # 或在 GitHub 网页提
```

## 3. PR 描述

按 `.github/PULL_REQUEST_TEMPLATE.md` 写。重点小节：

### 改了什么

一段话 + 关键文件列表。

### 变更前预期

**改之前**写的话。哪怕只 3 行：

```markdown
- 用户行为：选 X 时预期看到 Y
- API：response 字段加 Z
- 兼容性：不破坏 fallback（27 路径仍能跑）
```

### 变更后端测效果

**改完跑完测试后**写的话。要具体：

```markdown
- npm run lint：0 warning
- npm run build：Next 16.3.4 编译 25s 通过
- node tests/core-branches.mjs：PASS: 3 first-round, 9 combined, 27 summaries
- 浏览器实测：截图见 ...
```

### 影响范围

- 触及了哪些 agent？
- 触及了哪些 frozen 资源？（如触及，必须 justify）
- 触及了哪些契约？
- 触及了 `.harness/`？（如触及，同步 `.harness/INDEX.md`）

## 4. 等 review

- CODEOWNERS 自动加 reviewer
- 改 `src/agents/action/` → `@MiniMax/action-team` 必 review
- 改 `.harness/` → `@MiniMax/maintainers` 必 review
- 改了 frozen 资源 → `@MiniMax/maintainers` 必 review

## 5. 修 review 意见

把 review 意见一条条 commit 到同一分支（push 上去自动更新 PR）。如果 review 让你大改，考虑拆 PR。

## 6. Merge 要求

- [ ] CI 全绿
- [ ] 至少 1 个 maintainer approve
- [ ] 所有 review conversation resolved
- [ ] 分支同步 main（如果有冲突，rebase 或 merge main）
- [ ] commit message 符合 `.harness/rules/commit-policy.md`

## 7. Merge 后

- 分支自动删除（repo 设置）
- 改动进 main 后，CI 再跑一次
- 部署（如有）走 [`../deployment/local.md`](../deployment/local.md) 或 [`../deployment/cloud.md`](../deployment/cloud.md)

## 8. 重大变更 → 写 change report

如果你的 PR：
- 改了 API 契约
- 改了席位 prompt
- 改了 fallback 路径
- 改了数据结构
- 触及 frozen 资源

写一份 [`../change-reports/YYYY-MM-DD-<slug>.md`](../change-reports/TEMPLATE.md)，路径放进 PR 描述的"关联的"小节。

## 常见问题

### PR 太大 / commit 太多

超过 20 个 commit 或 1000 行 diff 拆 PR。拆的依据：
- 一个 PR 一个变更主题（不一定要原子，但要有焦点）
- 一个 PR 一个"可独立 review"的子集

### CI 挂了

看 [`../development/workflow.md`](../development/workflow.md) 的"跑校验"小节。如果 27 路径红了，先本地复现：

```bash
npm run build
npm run start &
node tests/core-branches.mjs
```

### Reviewer 没响应

@ 一下 maintainer，或在 Discussions 里 ping。如果 7 天没响应，self-merge（如果你是 maintainer）。

### 想 draft PR 早期反馈

PR 标题加 `[WIP]` 前缀，或在 GitHub UI 选 "Draft"。等改完转 "Ready for review"。
