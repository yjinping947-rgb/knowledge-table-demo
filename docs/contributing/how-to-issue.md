# 怎么提 issue

> 模板在 `.github/ISSUE_TEMPLATE/{bug.md,feature.md}`。本文讲"什么时候提、怎么提"。

## 提 issue 之前

- [ ] 搜过现有 issue（不要重复提）
- [ ] 跑过最新 main（不是旧的 fork）
- [ ] 看过 [`../architecture/overview.md`](../architecture/overview.md) 和 [`../change-reports/`](../change-reports/) — 也许已经有人提过 / 修过

## 选对模板

| 情况 | 用 |
|---|---|
| 跑不起来 / 跑错了 / UI 错了 / AI 答非所问 | `.github/ISSUE_TEMPLATE/bug.md` |
| 想加新功能 / 新 agent / 新讨论路径 | `.github/ISSUE_TEMPLATE/feature.md` |
| 想法 / 闲聊 / 问个问题 | Discussions（不要开 issue） |
| 安全漏洞 | 私密上报 → `.github/ISSUE_TEMPLATE/config.yml` 里的 security advisory 链接 |

## Bug 报告关键点

参考 `.github/ISSUE_TEMPLATE/bug.md` 的字段，重点说清：

1. **复现步骤** — 1/2/3 一步步写，让别人能复现
2. **期望 vs 实际** — 你希望看到什么 vs 实际看到什么
3. **环境** — Node 版本、浏览器、`AI_API_KEY` 有无、`mode: "ai"` 还是 `mode: "fallback"`
4. **可能的原因**（可选）— 哪个 agent 的问题？director 路由？fallback？UI 不变性？

好的 bug 报告示例：

> **现象**：选 `support_quit` → 第二轮 `wait_offer` 时，回复的 sourceIds 里出现了 `S01`（行动派的来源），但该选路径应该由 action 回应，OK 没问题；但 `hostComment` 字数显示 80 字，超出 100 字限制。
>
> **复现步骤**：
> 1. `npm run dev`
> 2. 打开 http://localhost:3000
> 3. 第一轮选"支持裸辞"
> 4. 第二轮选"等 offer"
> 5. 看到 hostComment 是 80 字（但模板说 ≤ 100 字）
>
> **期望**：hostComment 应该是 ≤ 70 字（规则里写的是"实际 ≤ 70"）
>
> **可能原因**：`src/lib/fallback/discuss.ts` 的 `hostComment` 长度超了，或 `.harness/contracts/discuss.md` 的"实际值"没同步进 validator

## Feature 请求关键点

参考 `.github/ISSUE_TEMPLATE/feature.md`，重点说清：

1. **一句话需求** — 用一句话说"用户能做什么之前做不了的事"
2. **动机** — 谁受益？跟现有功能的关系？
3. **提议方案** — 触及哪些目录？触及哪些 agent？要更新 `.harness/contracts/` 吗？fallback 怎么走？
4. **验收标准** — 用户视角 / 工程视角 / harness 视角
5. **范围** — MVP 是什么？哪些放下一期？

好的 feature 请求示例：

> **一句话需求**：让用户能在 demo 里看到自己"被 AI 导演选中了哪个席位"的理由。
>
> **动机**：现在 user 选了立场后，AI 选了什么席位、为什么选，用户是黑盒看到的。加一个"导演说明"小卡片能提升可解释性。
>
> **提议方案**：
> - 在 `src/agents/director/router.ts` 加一个 `reason: string` 字段，解释为什么选这个席位
> - `src/lib/types.ts` 加 `DiscussionReason` 类型
> - `app/api/discuss/route.ts` 返回值加 `reason` 字段
> - 前端 `src/client/knowledge-table/stages/ResponseStage.tsx` 在 `HostStrip` 下面加一个"为什么是这个席位"折叠卡
> - 同步更新 `.harness/contracts/discuss.md`（新增字段）和 `.harness/agents/director.md`（新增 reason 字段说明）
>
> **验收标准**：
> - 27 路径全绿（新增字段不影响 fallback）
> - 浏览器实测：每轮回应后能看到"导演选择理由"
> - AI 模式下 reason 是有意义的，fallback 模式下 reason 是固定文案
>
> **范围**：
> - MVP：只加 reason 字段 + 折叠卡
> - 下一期：reason 可点击展开看 director 决策的"评分明细"（基于哪些 sourceIds 命中）

## 提完 issue 后

- 等 triage 标签（`needs-triage` → `bug` / `enhancement` / `duplicate` / `wontfix`）
- 如果要 PR 修这个 issue，在 PR 描述里 `Fixes #<number>`
- 跟进：issue 状态变了会有邮件通知

## 何时自己关 issue

- 重复 → 关掉，留个 "duplicate of #<number>" 评论
- 已修 → 跑最新 main 验证，验证通过关掉
- 不在范围 → 解释后关，标 `wontfix`
- 缺信息 → 等作者回复，2 周没回就关
