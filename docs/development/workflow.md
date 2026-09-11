# 改代码的标准流程

> 从"我想改 X"到"PR 合进 main"的完整路径。

## 1. 拉分支

```bash
git checkout main
git pull
git checkout -b <type>/<scope>-<short-desc>
```

参考 [`branching.md`](./branching.md)。

## 2. 读相关文档

按改动范围：

| 改的内容 | 必读 |
|---|---|
| 任何 agent 的代码 | `.harness/agents/<role>.md` |
| 任何 agent 之外的业务代码 | `.harness/INDEX.md`（确认 module owner） |
| UI（`src/client/` / `components/`） | `.harness/rules/ui-invariance.md` |
| API 路由（`app/api/*/route.ts`） | `.harness/contracts/{discuss,summary}.md` + `.harness/rules/privacy.md` |
| 兜底（`src/lib/fallback/`） | `.harness/rules/fallback-policy.md` + `.harness/skills/author-fallback.md` |
| 治理层（`.harness/`） | `.harness/INDEX.md`（必须同步更新） |
| 提交 / hook | `.harness/rules/commit-policy.md` + `.harness/hooks/` |

## 3. 写"变更前预期"

在动手**之前**，写下"我预期这次改完会怎样"。哪怕只 3 行：

```markdown
## 变更前预期

- 用户行为：选 `support_quit` 后第二跳 `wait_offer` 时，action 席位会被导演选中
- 兼容性：不破坏 fallback（27 路径仍能跑）
- 性能：no regression
```

可以放在 commit message body，也可以放在 [`change-reports/YYYY-MM-DD-<slug>.md`](../change-reports/TEMPLATE.md)。

## 4. 改代码

边改边 `npm run dev` 在浏览器看效果。

## 5. 跑校验

```bash
npm run lint                            # eslint
npm run build                           # next build（类型 + 打包）
npm run start &                         # 启服务
node tests/core-branches.mjs            # 27 路径核心回归（如适用）
```

## 6. 写"变更后端测效果"

在 PR 描述里写实际验证下来是什么：

```markdown
## 变更后端测效果

- `npm run lint`：通过
- `npm run build`：通过（Next 16.3.4 build 25s）
- `node tests/core-branches.mjs`：PASS: 3 first-round branches, 9 combined, 27 summaries
- 浏览器实测：选 support_quit → wait_offer，action 席位回复
- 截图：[attach]
```

## 7. 写变更报告（如果重大变更）

如果改动会影响：
- API 契约（`/api/*` 的入参 / 出参）
- 席位 prompt（让 AI 输出的"腔调"变了）
- 兜底路径（fallback 内容变了）
- 数据结构（`src/data/*.json` 字段变了）
- frozen 资源（哪怕只是 1 个 CSS class）

写一份 [`change-reports/YYYY-MM-DD-<slug>.md`](../change-reports/TEMPLATE.md)。

## 8. 提交

```bash
git add <files>
git commit -m "<type>(<scope>): <subject>"
# body 写"为什么"，引用 change-report 路径
```

参考 [`../contributing/commit-conventions.md`](../contributing/commit-conventions.md)。

## 9. 推 + 提 PR

```bash
git push -u origin <branch>
gh pr create --fill  # 或在 GitHub 网页提
```

PR 描述按 `.github/PULL_REQUEST_TEMPLATE.md` 写。

## 10. 等 review + CI

- CODEOWNERS 自动加 reviewer
- 改 `src/agents/action/` → 拉 `@MiniMax/action-team` review
- 改 `.harness/` → 拉 `@MiniMax/maintainers` review
- CI 跑 lint + build + 27 路径
- 必须所有 check 绿 + 至少 1 个 maintainer approve

## 11. Merge

- Squash merge（保持 main 历史干净）
- Merge 后分支自动删除

## 12. 更新文档

如果改的是：
- API 路由 → 更新 `.harness/contracts/*.md`
- 角色 → 更新 `.harness/agents/*.md`
- 模块 owner → 更新 `.harness/INDEX.md`
- 部署方式 → 更新 `docs/deployment/*.md`

## 一图速览

```
读治理层  →  拉分支  →  写预期  →  改代码
                                    ↓
                              跑 lint + build + test
                                    ↓
                              写端测效果 + change report
                                    ↓
                              commit  →  push  →  PR
                                                ↓
                                          review + CI
                                                ↓
                                              merge
                                                ↓
                                          同步文档
```
