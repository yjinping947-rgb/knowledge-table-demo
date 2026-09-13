# Harness 与四个 Skill 的工作流收口

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-13 |
| 时间戳 | 12:56 |
| 作者 | Codex |
| 关联 PR | 待推送后补充 |
| 关联 commit | 本文件所在提交，最终 hash 以推送结果为准 |
| 关联 issue | 未使用 GitHub CLI；本次无跨角色需求记录 |
| 影响模块 | `.harness/` `scripts/harness-check.mjs` `docs/harness/` `docs/requests/` `docs/deployment/records/` `docs/change-reports/` `package.json` |
| 影响契约 | `.harness/repo-manifest.json`、四个核心 skill、pre-commit workflow |

## 背景

当前仓库已经有 `.harness/`、四个核心 skill、change-report、Git hooks 和 CI，
但这些入口主要是分散的说明文档，缺少参考 `project-manage` 的几个关键闭环：

- harness 没有可机器检查的结构真源；
- commit 流程没有把“变更原因 → 编码 → 本地端到端测试 → 原因评论 → push”固定成一条顺序；
- 部署 skill 还停留在本地/云端候选说明，缺少统一的部署记录产物；
- 需求协作 skill 依赖 `gh`，没有 GitHub CLI 不可用时的本地共享入口；
- 语料 skill 还没有把当前 `zhihu-cli` 搜索、`topics.json`、embedding 和未来 API 采集的边界说明清楚。

## 变更前预期

### 用户行为

- 不改变现有页面、API、RAG 结果和 UI 同事正在修改的文件。
- 进入项目后可以从 `.harness/AGENTS.md`、`.harness/INDEX.md` 和 manifest 找到统一工作流。
- 四个核心 skill 都能明确说明触发时机、输入、输出、失败处理和交付证据。

### 数据 / API

- 不改变现有 API 入参、出参和现有语料数据。
- 只增加 harness 校验、变更报告、需求请求和部署记录等治理产物。

### 兼容性

- 保留现有 `.harness/skills/*.md` 路径和原有章节。
- 保留历史 change-report 文件；新报告使用 `YYYY-MM-DD-HHMM-<slug>.md`。
- `gh` 不可用时，需求协作与提交原因评论落到仓内 Markdown，不阻塞本地工作。

### Harness 影响

- 新增 machine-readable repo manifest 和 `npm run harness:check`。
- pre-commit 增加轻量 harness 检查，阻止 manifest、canonical command 或失效 skill 链接漂移；时间戳报告由 commit skill 作为提交前流程门禁。
- 四个核心 skill 增加可执行的闭环说明。

## 改了什么

- `.harness/repo-manifest.json`：新增机器可读的入口、owner、canonical commands、skills 和工件分层。
- `scripts/harness-check.mjs`、`package.json`、`.harness/hooks/pre-commit.mjs`：新增 `npm run harness:check`，并接入 pre-commit。
- `.harness/AGENTS.md`、`.harness/INDEX.md`、`.harness/roles/{agent-dev,corpus}.md`：补齐 manifest 导航、共享工件入口和当前语料边界。
- `.harness/skills/commit-with-rationale.md`：固定“变更原因报告 → 编码 → 本地端到端验证 → 变更原因评论 → commit → push”，要求每次提交使用时间戳报告。
- `.harness/skills/deploy-app.md`：增加本地 / 云端部署记录草稿、provider-neutral 边界、健康检查和真实部署证据要求。
- `.harness/skills/request-from-teammate.md`：增加 `docs/requests/YYYY-MM-DD-HHMM-<slug>.md` 命名、开发前和开发后扫描、无 `gh` 的本地 fallback。
- `.harness/skills/add-corpus.md`：按当前 ZhihuCLI → `topics.json` → embedding 流程更新，明确覆盖式采集、增量 embedding、Windows CLI 限制和未来 API/search adapter 边界。
- `docs/harness/README.md`、`docs/requests/{README,TEMPLATE}.md`、`docs/deployment/records/README.md`、`docs/README.md`：新增共享入口和证据目录。
- `docs/architecture/harness.md`、`docs/contributing/skill-reference.md`：同步四个核心 skill 和辅助 skill 的导航。
- `tests/rag-quality.mjs`：让 `/api/topics` 数量断言从 `src/data/topics.json` 派生，避免 T21 等新增话题造成测试失真。
- 未修改 UI、业务 API 响应结构或 `src/data/topics.json`；原 UI 协作者文件保持不动。

## 变更后端测效果

- `npm ci`：通过；依赖安装无漏洞。
- `npm run harness:check`：通过，manifest、4 个核心 skill、相对链接和 package scripts 均通过。
- `git diff --check`：通过。
- `npm run lint`：通过，0 errors / 4 warnings；4 个 warning 为现有业务文件的 unused-vars，本次未触及。
- `npm run typecheck`：通过。
- `npm run build`：通过，Next.js 16.3.4 生产构建完成。
- 本地生产：3000 已被占用，使用 `PORT=3100 npm run start`；首页和 `/api/topics` 健康检查均 HTTP 200。
- `BASE_URL=http://127.0.0.1:3100 npm run test:all`：在本机 OpenAI-compatible mock provider 下通过，`core` 27 路径、RAG 8 路径、RAG quality 10/10 全部通过。
- 无 AI 配置的 fallback 运行也完成检查；`/api/answer` 按现有实现返回 fallback 和空 `retrieved`，因此不把无配置结果冒充为完整 RAG 通过。

## 变更原因评论

这次改动是为了让 harness 从“分散的说明”变成可导航、可检查、可留下证据的协作控制面：提交有时间戳报告和原因评论，部署有不含 secret 的记录，跨角色协作在 `gh` 不可用时仍有仓内真源，语料流程也明确了当前覆盖式采集与未来 API adapter 的边界。验证结果显示 manifest 检查、类型检查、构建和本机 mock provider 下的全部 27 + 8 + 10 条端到端路径均通过；没有改变 UI、业务 API 或原始语料。

## 需求协作扫描

- 开发前：`gh` 不可用；扫描 `docs/requests/`（排除 README / TEMPLATE）和最近 change reports，没有 open / in-progress 的待处理需求。
- 开发后：再次扫描同一范围，没有产生需要交给其他角色的后续事项，记录为 `no follow-up request`。

## 风险 / 回滚

- 风险：新增 harness check 会让 manifest、canonical command 或 skill 相对链接漂移的提交失败；lint 仍有仓库原有 4 个 warning。
- 回滚：`git revert <commit>`；如需临时绕过，可单独回退 `.harness/hooks/pre-commit.mjs` 的 harness 检查步骤。

## 后续 TODO

- [ ] 有 GitHub CLI 后，可把未来产生的本地需求请求同步成 GitHub Issue。
- [ ] 选定真实云平台后，把云端部署 skill 的 provider-specific 脚本补齐。
- [ ] 若接入官方/API 搜索，新增采集 adapter，并保留当前 `zhihu-cli` 作为兼容来源。
