# Skill · 带理由的提交

## 何时加载

每次要 `git commit` 之前。

## 核心理念

> **不要裸 commit。** 每条 commit 必须有"为什么"和"结果"，写在 `docs/change-reports/` 的时间戳文件里。
> 未来的你（或者其他协作者）回头看 git log 时，能直接看到“为什么改、改了什么、效果怎样”。

## 交付闭环（不可跳步）

每一次提交都按下面的顺序完成，并把证据写回同一个时间戳报告：

```text
变更原因报告 → 编码 → 本地端到端验证 → 变更原因评论 → commit → push
```

“变更原因评论”是面向 reviewer 的短摘要，至少回答“为什么现在改、解决了什么、测试证明什么”。有 `gh` 且已登录时，提交后可用 `gh pr comment` 发布；没有 `gh` 时，把评论写在报告的 `## 变更原因评论`，并在 PR 描述或仓内协作记录中引用它。任何模式都不得把 Token、密码或环境变量值写入报告。

## 工作流（闭环）

### 1. 写变更前预期

**改代码之前**先建一个时间戳命名的报告：

```bash
# 时间戳格式：YYYY-MM-DD-HHMM（精确到分钟，1 天内多次提交不冲突）
TIMESTAMP=$(date +%Y-%m-%d-%H%M)
SLUG=<本次主题，kebab-case，30 字内>
FILE="docs/change-reports/${TIMESTAMP}-${SLUG}.md"
```

每次 commit 都必须新建一个报告；如果同一分钟已有同主题文件，在 slug 后追加 `-2`、`-3`，不要覆盖已有报告。

报告内容从 [`docs/change-reports/TEMPLATE.md`](../../docs/change-reports/TEMPLATE.md) 复制模板，至少填三段：

- **变更前预期**（改之前写）
  - 用户行为层面：什么会变？
  - API / 数据层面：什么会变？
  - 兼容性：是否破坏？
  - 性能 / 安全：风险点？
- **改了什么**（边改边补）
- **变更后端测效果**（改完跑完测试写）

### Step 1.5: 选报告模式

按改动规模选：

| 模式 | 何时用 | 内容 |
|---|---|---|
| **Full**（标准）| 跨模块 / 改 API / 改 frozen / 大重构 | 上面 3 段 + 风险 + 回滚 + 后续 TODO + 关系链接（~80-150 行）|
| **Minimal**（小改动）| 改 docs / 改 skill / 改 governance / bug fix 单文件 | 3 段就够（~30-60 行）|

**Minimal 模式模板**（直接复制）：

```markdown
# <一句话变更主题>

| 字段 | 值 |
|---|---|
| 日期 | YYYY-MM-DD |
| 时间戳 | HH-MM |
| 作者 | @<handle> |

## 变更前预期

- 用户行为：<什么会变 / 不会变>
- 数据 / API：<什么会变 / 不会变>
- 兼容性：<破坏 / 向后兼容>

## 改了什么

- <path1>：<改了啥>
- <path2>：<改了啥>

## 变更后端测效果

- `npm run lint`：<0 warnings | N warnings>
- `npm run build`：<通过 | 失败 + 原因>
- `node tests/<test>.mjs`：<PASS: ... | FAIL: ...>

## 风险 / 回滚

- 风险：<简述>
- 回滚：`git revert <commit>`
```

> 实战经验：Minimal 模式 80% 的情况够用，Full 模式 20%（跨模块 / 改 API / 大重构）。

### 2. 编码

按 `.harness/INDEX.md` 第 1 节"模块 → owner"确认你的 scope，按对应 `.harness/agents/*.md` / `.harness/rules/*.md` 约束改。

### 3. 端到端本地测试

按改动范围选：

| 改了 | 跑 |
|---|---|
| `app/api/{discuss,summary}/route.ts` 或 `src/lib/fallback/` | `npm run test:core`（27 路径） |
| `app/api/answer/route.ts` 或 `src/lib/rag/` | `npm run test:rag`（8 RAG 路径） |
| 都改了 | `npm run test:all` |
| UI（`src/client/` / `components/`） | 浏览器实测 + 确认 55 class 不变（见 `.harness/rules/ui-invariance.md`） |
| `src/data/topics.json` | 按 `add-corpus` skill 校验；增量数据跑 `node scripts/embed-topics.mjs`，覆盖式采集才跑 `npm run rag:build`，然后再跑 `npm run test:core` |

把命令输出贴到报告的"变更后端测效果"。

### 4. commit

按 `.harness/rules/commit-policy.md`：

```bash
git add <files>
git commit -m "<type>(<scope>): <subject>"
# body 写“为什么”，引用 change report 路径
```

提交前确认报告已经包含实际测试结果和 `## 变更原因评论`。不要先 commit 再补报告。

subject ≤ 30 字，type ∈ {feat, fix, refactor, test, docs, chore, style, perf, ci, revert}。

scope 与变更主要目录对应：`harness` / `agents` / `api` / `client` / `corpus` / `sdk` / `docs` / `tests` / `ci` / `deps` / `user` / `data` / `director` / `action` / `realist` / `conditional`。

### 5. 推远程 + 提 PR

```bash
git push -u origin <branch>
# 用 gh CLI 或网页提 PR，按 .github/PULL_REQUEST_TEMPLATE.md 写
```

推送前先运行 `git status --short --branch`、`git log -1 --oneline` 和 `git push --dry-run origin HEAD:<branch>`。dry-run 失败时停止，不绕过保护分支、不 force push；权限问题交给仓库 owner 处理。推送成功后把远端分支 URL、commit hash 和报告路径回填到报告。

PR 描述里**必带**：

- 改了什么（一段话 + 文件列表）
- 关联的 issue / change report（`Fixes #123` / `Refs docs/change-reports/...`）
- 变更前预期（从报告复制）
- 变更后端测效果（从报告复制）
- 影响范围（触及哪些 agent / frozen 资源）

## 时间戳命名规则

- **格式**：`YYYY-MM-DD-HHMM`（年-月-日-时-分）
- **示例**：`2026-09-12-1430-fix-director-router-fallback.md`
- **理由**：1 天内可能多次提交，日期+分钟避免冲突
- **不要用**：
  - `YYYY-MM-DD-HHMMSS`（秒级太细）
  - Unix timestamp（`1736630400.md`，不可读）
  - 仅日期（`2026-09-12.md`，1 天只能 1 个）

## 自检清单

提交前：

- [ ] 时间戳报告已建（`docs/change-reports/${TIMESTAMP}-${slug}.md`）
- [ ] 报告"变更前预期"段已写
- [ ] 改动范围内测试已跑（`npm run test:core` / `test:rag` / `test:all`）
- [ ] 已按 `request-from-teammate` 完成开发前和开发后需求扫描
- [ ] 有后续协作时已创建 `docs/requests/YYYY-MM-DD-HHMM-<slug>.md`；无后续事项时报告已写 `no follow-up request`
- [ ] 报告"变更后端测效果"段已贴命令输出
- [ ] commit subject ≤ 30 字
- [ ] type ∈ 10 个允许值
- [ ] scope 与变更主要目录对应
- [ ] body 引用了 change report 路径
- [ ] 报告已包含“变更原因评论”，并已准备发布到 PR 或保留为仓内评论证据
- [ ] `npm run harness:check` 通过
- [ ] 已完成 dry-run，再执行实际 push
- [ ] 改了 `.harness/` → 同步 `.harness/INDEX.md`
- [ ] 改了 UI（`src/client/` / `components/`）→ 读 `.harness/rules/ui-invariance.md`
- [ ] 改了 API → 确认 `AI_API_KEY` 不出现在客户端代码
- [ ] 改了 `src/lib/fallback/` → 27 路径 fallback 验证过

## 常见反模式

❌ **裸 commit**：
```
fix: 修 bug
```
✅ **带理由**：
```
fix(director): 补全 router 9 路径 fallback

之前 round 2 时 director 路由漏了 depends + set_deadline 组合，
会落到非预期席位。现在 router.ts 的 secondRoundTable 补全 9 路径。

Refs docs/change-reports/2026-09-12-1430-fix-router-fallback.md
```

❌ **把报告写在 commit message 里**：
太长，commit message 应该是"为什么 + 引用"，详细内容放报告里。

✅ **commit message 引用报告路径**：
```
Refs docs/change-reports/2026-09-12-1430-fix-router-fallback.md
```

## 跟其他 skill / rule 的关系

- 报告模板：[`docs/change-reports/TEMPLATE.md`](../../docs/change-reports/TEMPLATE.md)
- 写报告技能：[`.harness/skills/write-change-report.md`](./write-change-report.md)
- commit 规范：[`.harness/rules/commit-policy.md`](../rules/commit-policy.md)
- 分支规范：[`.harness/rules/branch-policy.md`](../rules/branch-policy.md)
- PR 模板：[`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)
