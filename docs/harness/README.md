# Harness 工程入口

这里记录项目级治理层的机器真源与长期约定。业务代码仍以 `src/`、`app/` 和 `components/` 为准，`.harness/` 只负责导航、协作协议和验证入口。

## 入口顺序

1. 先读 [`.harness/AGENTS.md`](../../.harness/AGENTS.md)。
2. 再读 [`.harness/INDEX.md`](../../.harness/INDEX.md) 和 [`.harness/repo-manifest.json`](../../.harness/repo-manifest.json)。
3. 按任务加载对应 skill、role 和 rule。
4. 用 `npm run harness:check` 验证入口文件、skill 链接和 canonical commands。

## 工件分层

- `docs/change-reports/`：每次提交的变更原因、测试证据和原因评论。
- `docs/requests/`：跨角色需求扫描与需求记录；没有 `gh` 时的共享协作真源。
- `docs/deployment/records/`：本地或云端部署的可复核记录。
- `src/data/topics.json`：当前语料源数据；`topic-embeddings.json` 是可重建产物。
- `.tmp/`、日志和 PID 文件：临时运行痕迹，不作为长期事实源。

## 维护规则

新增关键入口时同步 manifest；修改 `.harness/` 时同步 `INDEX.md`，并保留向后兼容的 skill 路径。治理层改动不得改变页面、API、RAG 数据或 UI 协作者的工作区。
