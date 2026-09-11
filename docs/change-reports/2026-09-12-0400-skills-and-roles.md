# 4 个 Skill + 4 Human 角色 — 开发协作治理

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 作者 | @always |
| 关联 commit | （本次） |
| 影响模块 | `.harness/{skills,roles}/` + `docs/contributing/` + `.harness/{AGENTS.md,INDEX.md}` + `.gitignore` + 几个支持性 fix |

## 背景

项目开发协作缺少统一的 skill 流程和 human team 角色定义。这次 PR 一次性补齐：

- **4 个核心 skill**（开发协作）：commit-with-rationale / deploy-app / request-from-teammate / add-corpus
- **4 个 human team 角色**（开发职责）：agent-dev / ui-design / feature-design / corpus
- **配套文档**：skill 总览 + 跨角色工作流
- **修复**：b8e564f commit 后 RAG topic-embeddings.json 的 gitignore 路径、.harness/INDEX.md 等与新结构对齐

## 变更前预期

### 用户行为

- 不变 — 这是纯治理层 + 文档，对外接口 0 影响
- 27 路径 + 8 RAG 路径全绿（与重构前一致）

### 数据 / API

- 不变 — 不改任何运行时
- 仅修 `src/lib/rag/index.ts` 导出 + 修 `src/lib/rag/topics.ts` 补实现 + 修 `package.json` 路径

### 兼容性

- 完全兼容 — 没破坏任何已有功能
- `topic-embeddings.json` 不入库（更新 .gitignore）

### Harness 影响

- 治理层从 6 规则 / 4 技能 → **6 规则 / 8 技能（4 核心 + 4 辅助）/ 4 角色**
- 加 docs/contributing/{skill-reference,cross-role-workflow}.md

## 改了什么

### 新建（4 skill）

- `.harness/skills/commit-with-rationale.md` — 写变更前预期 → 编码 → 端测 → 写变更后端测效果 → commit + push
- `.harness/skills/deploy-app.md` — 4 种模式（dev / local-prod / CI / cloud 占位）+ 健康检查 + 回滚
- `.harness/skills/request-from-teammate.md` — 扫别人需求 + 提需求给对应角色 + 4 角色路由表
- `.harness/skills/add-corpus.md` — 写 `src/data/topics.json` + 跑 `npm run rag:build` + 验证

### 新建（4 role）

- `.harness/roles/agent-dev.md` — Agent 运行时开发（owner `src/lib/{ai,rag,fallback,prompts,validators,types.ts}` + `src/agents/`）
- `.harness/roles/ui-design.md` — UI 设计（owner `src/client/` + 4 frozen 资源）
- `.harness/roles/feature-design.md` — 功能设计（owner `app/api/` + `.harness/contracts/` + `tests/`）
- `.harness/roles/corpus.md` — 语料收集（owner `src/data/` + `scripts/`）

### 新建（2 doc）

- `docs/contributing/skill-reference.md` — 4 skill 总览 + 关系图
- `docs/contributing/cross-role-workflow.md` — 4 角色如何协作 + 典型工作流 + review 矩阵

### 修改

- `.harness/AGENTS.md` — 改第 1 节（项目一句话：RAG 真实内容）+ 加第 6 节"4 核心 skill" + 加第 7 节"5 AI 角色 + 4 Human 角色"
- `.harness/INDEX.md` — 拆第 4 节为 4a（核心 skill）+ 4b（辅助 skill）+ 加第 8 节"4 Human 角色"
- `.gitignore` — 修 topic-embeddings 路径（`src/data/...`）+ 加 `.tmp/` + `*.log` + `verify-*.txt`
- `src/lib/rag/index.ts` — 导出 topics 模块函数（`loadTopics` / `loadTopicEmbeddings` / `listTopics` / `retrieveFromTopics` + types）
- `src/lib/rag/topics.ts` — 补实现（b8e564f commit 时是空文件，现在填上：loadTopics / loadTopicEmbeddings / listTopics / retrieveFromTopics）
- `package.json` — 修 `rag:build` 脚本路径（`modules/corpus/scripts/...` → `scripts/...`，因为 scripts 没真移到 modules/）

## 变更后端测效果

### 自动化测试

- `npm run build` — TypeScript 2.2s + Next 16.3.4 build 651ms 通过
- `npm run lint` — 0 warning
- `node tests/core-branches.mjs` — **PASS: 3 first-round / 9 combined / 27 summaries / source 约束 / 长度边界 / 非法输入**
- `node tests/rooms-rag.mjs` — **PASS: 8 RAG path checks**（list / single / 404 / question / roomId / 400 / type / invalid）
- `npm run rag:build` — 1175 embeddings 生成成功（149.4s, 33.25MB, 1536 维）

### 手动验证

- 4 个 skill 都有 frontmatter 完整 + 内容可读
- 4 个 role 都有 owner 目录 + 协作场景 + 关键约束
- cross-role-workflow.md 4 个典型场景都画了流程
- skill-reference.md 关系图清晰
- AGENTS.md 必读顺序从 8 步扩到 10 步（加 4 角色 + 2 skill）
- INDEX.md skill 列表从 4 扩到 8（4 核心 + 4 辅助）

### 边界 / 异常

- `.gitignore` 修了 `topic-embeddings.json` 路径（之前是 `modules/corpus/src/data/...`，是上次重构留下的，现在改为 `src/data/...`）
- `src/lib/rag/topics.ts` 之前是空文件（b8e564f commit 时漏了实现），现在补完
- 不动 frozen 资源（`app/globals.css` / `app/layout.tsx` / `app/page.tsx` / `public/assets/`）

## 风险 / 回滚

- **风险点**：4 个 skill + 4 个 role 是文档，没有强制执行（不像 hooks）。如果团队成员不读就直接 commit，会绕开 skill 流程
  - 缓解：code owner review + CODEOWNERS 自动加 reviewer + CI 跑测试
- **风险点**：时间戳命名（`YYYY-MM-DD-HHMM`）是新约定，跟已有的 `YYYY-MM-DD` 命名有差异
  - 缓解：skill 里说清楚，新写的报告用时间戳，老的保持不变
- **回滚方式**：`git revert <commit-hash>` — 完全不影响运行时
- **回滚后状态**：恢复 4 个 skill 缺失 + 4 个 role 缺失的状态

## 后续 TODO

- [ ] 跑 `npm run rag:build` 后让 git status 确认 `src/data/topic-embeddings.json` 被 gitignore 忽略
- [ ] 建 4 个 GitHub team（agent-dev / ui-design / feature-design / corpus），更新 CODEOWNERS 把目录映射到对应 team
- [ ] 实际使用 skill：下次 commit 时建时间戳 report
- [ ] 实际用 request-from-teammate：下次跨角色改动时开 issue

## 4 skill 设计要点

| Skill | 触发时机 | 关键产物 |
|---|---|---|
| commit-with-rationale | `git commit` 前 | 时间戳 report + commit + PR |
| deploy-app | 部署前 | 启动服务 + 健康检查 |
| request-from-teammate | 跨角色协作 | issue / PR @ + label |
| add-corpus | 加新语料 | `src/data/topics.json` + embedding |

每个 skill 都有：何时加载、流程、自检清单、与其他 skill/rule 的关系。

## 4 role 设计要点

| 角色 | owner 目录 | 与 5 AI 角色关系 |
|---|---|---|
| agent-dev | `src/lib/{ai,rag,fallback,prompts,validators,types.ts}` + `src/agents/` | 管 5 AI 角色运行时 |
| ui-design | `src/client/` + 4 frozen 资源 | UI 是 5 AI 角色前端 |
| feature-design | `app/api/` + `.harness/contracts/` + `tests/` | API 契约 + 测试 |
| corpus | `src/data/` + `scripts/` | 提供 RAG 语料 |

5 AI 角色（director / action / realist / conditional / user）是**运行时契约**，4 human 角色是**开发职责**。两层正交。
