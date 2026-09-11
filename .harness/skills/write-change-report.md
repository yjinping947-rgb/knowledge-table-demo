# Skill · 写变更报告

## 何时加载

- 完成一个会改变用户行为 / API 契约 / 数据结构的变更后
- 写 PR 时（PR 模板的"变更前预期"+"变更后端测效果"小节可指向变更报告）
- 做 demo / 演讲前需要梳理"从 P0 到 P1 我们改了什么"

## 输入

- 涉及的 PR 列表 / commit hash
- 触及的 agent 角色（见 `.harness/agents/*.md`）
- 触及的 API 契约（见 `.harness/contracts/*.md`）
- 测试数据：AI 模式 / fallback 模式 / 27 路径回归结果

## 输出

一份 markdown 报告，路径：

```
docs/change-reports/YYYY-MM-DD-<slug>.md
```

`slug` 用 kebab-case，30 字以内。

## 报告模板

直接复制 [`docs/change-reports/TEMPLATE.md`](../../docs/change-reports/TEMPLATE.md)。

## 自检清单

- [ ] 文件名符合 `YYYY-MM-DD-<slug>.md`
- [ ] 报告里同时有"变更前预期"和"变更后端测效果"
- [ ] 涉及契约（API / 类型）变化 → 已同步 `.harness/contracts/` 或 `src/lib/types.ts`
- [ ] 涉及席位 prompt 变化 → 已在 `.harness/agents/<seat>.md` 反映
- [ ] 涉及 fallback 路径 → 27 路径 fallback 验证过
- [ ] 引用了具体 commit hash（不是 PR 描述）
- [ ] 引用了 `node tests/core-branches.mjs` 的实际输出

## 历史报告

详见 [`docs/change-reports/`](../../docs/change-reports/)。

## 写报告的最小工作流

1. 改代码前先写"变更前预期"段（哪怕只 3 行）
2. 改完跑测试，把结果贴到"变更后端测效果"
3. 改完提交时把报告路径写进 commit message 的 body
4. 改完一周内把报告 review 一遍（防止"未来"的口径在事后被改写）
