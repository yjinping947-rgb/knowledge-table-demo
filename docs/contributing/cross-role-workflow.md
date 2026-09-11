# 跨角色协作工作流

> 4 个 human team 角色（agent-dev / ui-design / feature-design / corpus）如何协作。
> 角色定义在 [`.harness/roles/`](../../.harness/roles/)，技能在 [`.harness/skills/`](../../.harness/skills/)。

## 4 角色总览

| 角色 | owner 目录 | 关键 skill | 给谁提需求 |
|---|---|---|---|
| **agent-dev** | `src/lib/{ai,rag,fallback,prompts,validators,types.ts}` + `src/agents/` + `src/user/` | commit-with-rationale | ui-design / feature-design / corpus |
| **ui-design** | `src/client/` + `components/` + 4 个 frozen 资源 | commit-with-rationale | agent-dev / feature-design / corpus |
| **feature-design** | `app/api/` + `.harness/contracts/` + `.harness/evals/` + `tests/` + `.github/workflows/` | commit-with-rationale + deploy-app | agent-dev / ui-design / corpus |
| **corpus** | `src/data/` + `scripts/` | add-corpus + commit-with-rationale | agent-dev / feature-design / ui-design |

## 典型工作流

### 场景 1：加新语料（T21）

```
corpus          ──→  写 src/data/topics.json
                     ↓
                 跑 npm run rag:build
                     ↓
                 验证 27 路径 + 8 RAG 路径
                     ↓
                 commit-with-rationale
                     ↓
                 push + PR
                     ↓
feature-design  ← review: 测了没？新数据进了哪些 API 响应？
```

如果新语料改了 API 响应：

```
feature-design  ──→  改 .harness/contracts/answer.md
                     ↓
                 改 app/api/answer/route.ts
                     ↓
                 加 tests/rooms-rag.mjs 检查
                     ↓
                 commit-with-rationale
```

### 场景 2：加新 stage / component

```
ui-design       ──→  改 src/client/knowledge-table/stages/<NewStage>.tsx
                     ↓
                 改 state.ts（加新 stage 名 + reducer case）
                     ↓
                 验证 55 class 不变
                     ↓
                 commit-with-rationale
                     ↓
                 push + PR
                     ↓
agent-dev       ← review: 新 stage 需要 director 路由支持吗？
```

如果需要 director 路由支持：

```
agent-dev       ──→  改 src/agents/director/router.ts
                     ↓
                 跑 27 路径
                     ↓
                 commit-with-rationale
```

### 场景 3：加新 API 端点

```
feature-design  ──→  写 .harness/contracts/<new>.md（先写契约）
                     ↓
                 改 app/api/<new>/route.ts
                     ↓
                 加 tests/<new>.mjs
                     ↓
                 commit-with-rationale
                     ↓
                 push + PR
                     ↓
ui-design       ← review: 新 API 怎么展示？
agent-dev       ← review: 新 API 需要新 agent 输出吗？
```

### 场景 4：修 bug

```
谁发现 bug 谁提 issue / 自己修
  ↓
用对应的 skill 修（add-corpus / commit-with-rationale / ...）
  ↓
跑端到端测试
  ↓
写 change report（before/after）
  ↓
commit + PR
  ↓
@ 对应角色 review
```

## 协作检查清单

每次跨角色协作时：

- [ ] 我知道我的角色吗？（`cat .harness/roles/<role>.md`）
- [ ] 我扫了别人给我的需求吗？（`request-from-teammate` skill Step 2）
- [ ] 我知道这个改动影响其他角色吗？
- [ ] 我提需求时 @ 了正确的人 + 加了 label 吗？
- [ ] 我在 PR 描述里说明了影响范围吗？
- [ ] 我跑了对角色相关的测试吗？

## 跨角色 review 矩阵

| 改动 | 谁必 review | 谁建议 review |
|---|---|---|
| 5 角色 agent | agent-dev | feature-design（API 变了没） |
| fallback 内容 | agent-dev | feature-design（fallback 路径覆盖） |
| API 路由 | feature-design | agent-dev（agent 输出结构） |
| API 契约 | feature-design | 全体（契约变 = breaking） |
| 27/8 路径测试 | feature-design | 全体 |
| UI stage / 组件 | ui-design | agent-dev（路由） / feature-design（数据） |
| 55 class | ui-design | — |
| frozen 资源 | 全体 + maintainer | — |
| `src/data/*.json` | corpus | agent-dev（RAG 索引） |
| `scripts/*.mjs` | corpus | feature-design（package.json scripts） |
| `.harness/*` | maintainer + director | 全体 |
| `.github/workflows/*` | maintainer | feature-design |
| `package.json` | maintainer | — |

## 紧急协作（不阻塞别人）

如果改动小、不影响别人（纯本地优化），可以不走完整流程：

- **小改动**：自己 commit + push + PR，PR 描述里写"无需 review"
- **中等改动**：自己 commit + push + PR，@ 一个对应角色 review
- **大改动**：先开 issue 讨论 → 共识 → 开 PR → 全员 review

## 跨角色工作流（完整版）

```
        ┌──────────────────────────────────────┐
        │  request-from-teammate skill 启动    │
        │  扫别人给我的需求 + 我能给的需求     │
        └──────────────────────────────────────┘
                          ↓
        ┌──────────────────────────────────────┐
        │  在 .harness/roles/<role>.md 看 owner│
        │  改我 owner 的目录 / 等别人改        │
        └──────────────────────────────────────┘
                          ↓
        ┌──────────────────────────────────────┐
        │  commit-with-rationale 提交         │
        │  写 change report (时间戳) + commit  │
        └──────────────────────────────────────┘
                          ↓
        ┌──────────────────────────────────────┐
        │  push + PR                          │
        │  CODEOWNERS 自动加 reviewer          │
        │  CI 跑 lint + build + 测试          │
        └──────────────────────────────────────┘
                          ↓
        ┌──────────────────────────────────────┐
        │  review + merge                     │
        │  合并后扫一下衍生需求               │
        └──────────────────────────────────────┘
                          ↓
        ┌──────────────────────────────────────┐
        │  deploy-app 部署到本地/云端         │
        │  健康检查 + 监控                    │
        └──────────────────────────────────────┘
```

## 跟其他文档的关系

- 4 角色详细：[`.harness/roles/`](../../.harness/roles/)
- 4 skill 总览：[`skill-reference.md`](./skill-reference.md)
- 提交规范：[`commit-conventions.md`](./commit-conventions.md)
- 提 PR：[`how-to-pr.md`](./how-to-pr.md)
- 提 issue：[`how-to-issue.md`](./how-to-issue.md)
- 变更报告：[`../change-reports/TEMPLATE.md`](../change-reports/TEMPLATE.md)
- CODEOWNERS：[`../../.github/CODEOWNERS`](../../.github/CODEOWNERS)
