<!-- .github/PULL_REQUEST_TEMPLATE.md
     对标 Next.js / Vue / Nuxt / Supabase 的 PR 模板结构。
     重点：变更前预期 / 变更后端测效果 / 影响范围。 -->

## 改了什么

<!-- 一句话或一段说明这次 PR 做了什么。 -->
<!-- 如果改了多个模块，按模块拆条列出。 -->

## 关联的 Issue / 变更报告

<!--
Fixes #123  （关联 issue）
Refs docs/change-reports/2026-09-XX-xxx.md  （如果有）
-->

## 变更前预期

<!--
在改之前，写清楚"我预期这次改完会怎样"。这迫使作者在动手前先想清楚目标。
- 用户行为层面：UI / API 怎么变？
- 数据层面：数据怎么变？是否要 migration？
- 兼容性：是否破坏向后兼容？是否要 deprecate？
- 性能 / 安全：有没有预期改进 / 风险？
-->

## 变更后端测效果

<!--
改完之后，写清楚"实际验证下来是什么效果"。
- 跑了哪些测试？结果？
- 截图 / 日志 / curl 输出 / 录屏？
- AI 模式 vs fallback 模式都验证过？
- 27 路径回归（如果是改 discuss/summary）？
-->

## 影响范围

<!--
- 触及了哪些 agent / 模块？（用 .harness/agents/*.md 的角色名）
- 触及了哪些 frozen 资源？（app/globals.css / app/layout.tsx / app/page.tsx / public/assets/）
  如果触及，必须在 body 说明为什么必要，并在 PR 描述里 @director
- 是否影响 API 契约？（如果是，改了 .harness/contracts/*.md 吗？）
- 是否影响 harness 治理层？（如果是，同步更新 .harness/INDEX.md）
-->

## 自检清单

- [ ] `npm run lint` 通过
- [ ] `node tests/core-branches.mjs`（27 路径）全绿（如适用）
- [ ] `npm run build` 通过
- [ ] commit message 符合 `.harness/rules/commit-policy.md`（type + scope + subject ≤30 字）
- [ ] 分支名符合 `.harness/rules/branch-policy.md`（`<type>/<scope>-<desc>`）
- [ ] 改了 `.harness/` 下的文件 → 同步 `.harness/INDEX.md`
- [ ] 改了 UI（`src/client/` 或 `components/`）→ 先读 `.harness/rules/ui-invariance.md`
- [ ] 改了 `app/api/*/route.ts` → 确认 `AI_API_KEY` 不出现在客户端代码
- [ ] 改了 `src/lib/fallback/` → 27 路径 fallback 全部仍能产出
- [ ] 写了 change report（如适用）→ `docs/change-reports/YYYY-MM-DD-<slug>.md`

## 风险 / 回滚

<!--
- 风险点是什么？
- 如何回滚？（revert commit / 关闭 feature flag / 改配置？）
-->
