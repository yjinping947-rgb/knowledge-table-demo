# Skill · 跨角色提需求

## 何时加载

- **开发前**：扫一下最近的 change-reports / open issues，看有没有你负责的部分需要响应
- **开发后**：本次变更可能影响其他角色（UI / 语料 / 另一个 agent 席位），主动把需求提给对应人
- **跨人协作时**：任何需要别人配合的事

## 4 个角色（human team）

| 角色 | 负责 | 目录 | .harness/roles/ |
|---|---|---|---|
| **agent-dev**（Agent 运行时开发） | 5 角色 agent 运行时 + user 域抽象 | `src/lib/agents/`, `src/lib/rag/`, `src/lib/ai/`, `src/lib/fallback/`, `src/lib/prompts/`, `src/lib/validators/`, `src/lib/types.ts`, `src/lib/rag/topics.ts` | [`../../.harness/roles/agent-dev.md`](../../.harness/roles/agent-dev.md) |
| **ui-design**（UI 设计） | 客户端组件 + state + stages + 55 CSS class + 8 stage | `src/client/`, `components/`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | [`../../.harness/roles/ui-design.md`](../../.harness/roles/ui-design.md) |
| **feature-design**（功能设计） | API 路由 + 契约 + 跨模块工作流 + 评估 | `app/api/`, `.harness/contracts/`, `.harness/evals/`, `tests/` | [`../../.harness/roles/feature-design.md`](../../.harness/roles/feature-design.md) |
| **corpus**（语料收集） | 知乎语料 + embedding + RAG 数据 | `src/data/`, `scripts/collect-corpus-batch.mjs`, `scripts/embed-topics.mjs` | [`../../.harness/roles/corpus.md`](../../.harness/roles/corpus.md) |

> 注：这 4 个是**人类协作角色**（team roles），跟 `.harness/agents/` 下的 5 个 **AI 角色**（director / action / realist / conditional / user）是不同层。AI 角色是运行时契约，人角色是开发职责。

## 共享记录和命名

- 可执行的跨角色需求必须写到 `docs/requests/YYYY-MM-DD-HHMM-<slug>.md`。
- 新建记录时复制 [`docs/requests/TEMPLATE.md`](../../docs/requests/TEMPLATE.md)，不要只在聊天里口头转述。
- 本地 Markdown 是没有 `gh` 时的共享真源；有 `gh` 时，GitHub Issue / PR 只是同步面，Issue URL 回填到本地记录。
- 需求记录、扫描记录和评论都不得写入 Token、密码、Cookie、API key 或完整环境变量值。

## 工作流

### Step 1: 确认你的角色

打开 `.harness/roles/<your-role>.md`（或让 agent 自动读），里面写了：

- 你 owner 哪些目录
- 你需要 review 别人的什么改动
- 你可以提什么需求给别人

### Step 2: 扫一下"别人给你的需求"

**启动时必做**：让 agent 读以下文件，挑出跟你相关的：

```bash
# 最近 7 天的 change-reports
ls -t docs/change-reports/ | head -20

# open issues（label 过滤）
gh issue list --label "needs-<your-role>-review" --state open

# 最近的 PR（如果你有 merge 权限）
gh pr list --label "needs-<your-role>-review" --state open
```

或者在 agent 对话里说：

```
我是 <your-role>，扫一下最近 7 天的 change-reports + open issues + open PRs，
列出我需要响应的事项（按优先级）。
```

没有 `gh` 或 GitHub 网络不可用时，按同样的顺序扫描仓内共享记录：

```bash
find docs/requests -maxdepth 1 -type f -name '*.md' ! -name 'README.md' ! -name 'TEMPLATE.md' -print | sort
find docs/change-reports -maxdepth 1 -type f -name '*.md' ! -name 'TEMPLATE.md' -print | sort
rg -n "状态|owner|needs-|待处理|阻塞" docs/requests docs/change-reports --glob '!README.md' --glob '!TEMPLATE.md'
```

先看 `open` / `in-progress`，再按优先级和更新时间排序。GitHub Issue、PR 和仓内 Markdown 是同一需求的不同同步面，不能因为 `gh` 不可用而跳过开发前扫描。

### Step 3: 评估每个事项

| 事项类型 | 你该做什么 |
|---|---|
| 别人改了你 owner 的目录 | 看 diff，comment 或 approve |
| 别人提了 issue/PR 给你 | 评估需求是否合理，回 comment 或开始工作 |
| 别人提了 issue/PR 涉及其他角色 | 转发到对应角色（@ + label） |
| 没有人提需求 | 不动作 |

### Step 4: 把你的需求提给别人

当你需要别人配合时：

1. **先创建仓内记录**：按 `YYYY-MM-DD-HHMM-<slug>.md` 命名，并从 [`docs/requests/TEMPLATE.md`](../../docs/requests/TEMPLATE.md) 复制。
2. **打开 `.github/ISSUE_TEMPLATE/{bug,feature}.md`**，按模板准备同步内容。
3. **指定 owner**：在记录和 issue 描述里写明对应角色；GitHub 可用时 @ 对方并加对应 label（如 `needs-ui-design`）。
4. **背景 + 验收**：写清楚"为什么"和"完成标准"。
5. **链接 change report**（如果是从某次变更衍生的需求）：

```markdown
## 关联
Refs docs/change-reports/2026-09-12-1430-fix-router-fallback.md
```

6. **自审后再同步**：确认这确实需要 owner 配合，再用 `gh issue create` 或 PR 评论同步；没有 `gh` 时保留本地记录即可。

### Step 4.5: 选 workflow 模式

根据改动规模和协作人数选模式：

| 模式 | 何时用 | 怎么做 | 例子 |
|---|---|---|---|
| **Multi-PR**（标准）| 大功能 / 跨 3+ 角色 / 多人协作 | 每个角色一个 PR + 关联 issue | 加新赛季：corpus 加语料 PR + feature-design 加 API PR + ui-design 加前端 PR |
| **Single-PR**（快速）| 小到中改动 / 1-2 角色 / 1 人主导 | 一个 PR 完成多角色工作，PR 描述列各角色贡献 | 加 T21 9 条样本：corpus 自己直接 commit + 数据 API 同 PR |
| **Issue first**（探索）| 不确定方案 / 需讨论 | 先开 issue 收集意见 → 共识后开 PR | "AI 取代程序员"加多少条语料合适 |

> 实战经验：3 派 × 3 条 = 9 条样本的小改动，**Single-PR 够用**。30+ 条 / 跨 3 角色 / 加新组件 → Multi-PR。
> 关键判断：你的改动**能不能一个人一次 commit 搞定**。能 → Single-PR；不能 → Multi-PR + issue 跟踪。

### Step 5: 开发完成后的再次扫描

完成本次代码后，必须再运行一次 Step 2 的需求扫描，确认本次改动是否产生新的协作事项：

1. 重新扫描最近的 `docs/change-reports/`、`docs/requests/`，并在有 `gh` 时检查相关 Issue / PR。
2. 如果发现 UI、API、测试、语料或治理层的后续工作，按 Step 4 创建新的时间戳需求记录，并在记录中关联本次 change report。
3. 如果没有后续需求，在本次 change report 增加 `## 需求协作扫描`，至少写明扫描时间、角色、扫描范围和 `no follow-up request`。
4. 不要因为“没有后续需求”而创建空的 issue 或占位请求文件。

### Step 6: 跟踪

- **你提的需求**：用 `gh issue list --author=@me --state open` 看进度
- **别人给你的需求**：用 `gh issue list --assignee=@me --state open` 看
- 没有 `gh` 时：按 `docs/requests/README.md` 扫描 `open` / `in-progress` 记录，并更新 `最后更新`。
- **每周扫一次**（可在 cron / habit 里固化）

## 需求路由表

| 需求类型 | 提给谁 | label |
|---|---|---|
| 修改 5 角色 agent 的立场 / prompt / 路由 | agent-dev | `needs-agent-dev` |
| 改 `src/lib/fallback/` | agent-dev | `needs-agent-dev` |
| 改 API 路由契约 | feature-design | `needs-feature-design` |
| 加 / 改 stage / component / CSS class | ui-design | `needs-ui-design` |
| 加 / 改 27 路径测试 / RAG 测试 | feature-design | `needs-feature-design` |
| 加新语料 / 改 embedding 脚本 | corpus | `needs-corpus` |
| 改 `.harness/` 治理层 | 全体 review | `needs-all-review` |
| 改 frozen 资源（`app/globals.css` 等） | 全体 review（必须 justify） | `needs-all-review`, `breaking-change` |

## 自我检查清单

### 提需求前

- [ ] 这真的是我需要别人做的吗？（不是我能自己做的）
- [ ] 需求背景写清楚了吗？（为什么需要）
- [ ] 验收标准明确吗？（什么算完成）
- [ ] 关联的 change report 链上了吗？
- [ ] 提给了正确的角色？（不是全员泛指）
- [ ] 已按 `docs/requests/YYYY-MM-DD-HHMM-<slug>.md` 创建记录，并引用了模板

### 提需求后

- [ ] @ 了正确的人 / 加了正确的 label
- [ ] 写在了正确的 repo / 用了正确的 issue 模板
- [ ] 自己先 review 了一轮（避免"其实我自己能修"的低级需求）
- [ ] 通知了相关人（如果跨多角色）

### 开发后扫描

- [ ] 已重新扫描 `docs/requests/`、`docs/change-reports/` 和可用的 GitHub Issue / PR
- [ ] 有后续协作时，已创建新的时间戳需求记录
- [ ] 无后续协作时，change report 已明确记录 `no follow-up request`

## 完整工作流（从开发到发布）

```
1. 扫一下别人给你的需求（agent-dev / ui-design / feature-design / corpus）
2. 回应：comment / 接手 / 转发
3. 自己的开发工作
4. 改完跑测试（commit-with-rationale skill）
5. 写 change report
6. 再扫一次需求和变更记录
7. 如果有后续事项，按时间戳创建 `docs/requests/*.md`
8. commit + push + PR
9. PR 描述里 @ 相关角色
10. 监控 review 反馈
11. 合并后扫一下"有没有衍生需求要提给别人"
12. 提需求（用本 skill）
```

## 跟其他 skill / rule 的关系

- 本角色定义：[`.harness/roles/`](../../.harness/roles/)
- 4 角色总览：[`docs/contributing/cross-role-workflow.md`](../../docs/contributing/cross-role-workflow.md)
- 提交技能：[`.harness/skills/commit-with-rationale.md`](./commit-with-rationale.md)
- 部署技能：[`.harness/skills/deploy-app.md`](./deploy-app.md)
- 语料技能：[`.harness/skills/add-corpus.md`](./add-corpus.md)
- 报告模板：[`docs/change-reports/TEMPLATE.md`](../../docs/change-reports/TEMPLATE.md)
- Issue 模板：[`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/)
- CODEOWNERS：[`.github/CODEOWNERS`](../../.github/CODEOWNERS)
