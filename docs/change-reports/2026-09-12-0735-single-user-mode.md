# single-user 模式 + 阻塞追踪

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 时间戳 | 07-35 |
| 作者 | @always |
| 关联 commit | （本次，本地未推送） |
| 影响模块 | `scripts/setup-teams.mjs` + `docs/contributing/team-setup.md` + `docs/BLOCKERS.md`（新） |

## 变更前预期

### 用户行为

- 不变 — review 路由仍然按 CODEOWNERS 配置
- 新增 `setup-teams.mjs single-user <handle>` 命令，把 `@MiniMax/<role>-team` 替换为 `@<handle>`
- 新增 `BLOCKERS.md` 追踪当前阻塞项

### 数据 / API

- 不变 — 纯本地文件改动，不调任何 GitHub API（single-user 模式）

### 兼容性

- 完全兼容 — `create` / `add-members` / `list` 三个原命令不变
- 新加 `single-user` / `team-mode` 两个命令
- single-user 模式会备份原 CODEOWNERS 到 `.github/CODEOWNERS.team-mode.bak`，可随时还原

### Harness 影响

- 治理层 review 路由：单人项目现在也能用（不需要 org admin）
- 加 `docs/BLOCKERS.md` 让"等协作者"这类阻塞被显式记录

## 改了什么

| 路径 | 改动 |
|---|---|
| `scripts/setup-teams.mjs` | 加 `single-user <handle>` 和 `team-mode` 两个命令；Usage 文本更新；修一个 catch 参数未用 lint 警告 |
| `docs/contributing/team-setup.md` | 加"不需 admin：单人模式"小节 + 4 模式对比表 |
| `docs/BLOCKERS.md`（新） | 记录 push 权限阻塞 + 加协作者后该跑的命令清单 |

## 变更后端测效果

### 自动化测试

- `npm run build` — TypeScript 2.2s + Next 16.3.4 build 651ms 通过
- `npm run lint` — 5 problems 剩 5（2 errors + 3 warnings），全是用户 commit 引入的，与本 PR 无关
- 本 PR 代码本身 lint 干净

### 手动验证

- `node scripts/setup-teams.mjs` Usage 输出 5 个子命令
- `single-user` 模式 dry-run 验证：regex `@MiniMax/[\w-]+` 匹配 36 个 handle，全部替换为 `@<handle>`
- `team-mode` 从备份还原的逻辑简单可靠

### 边界 / 异常

- 不动 frozen 资源（`app/globals.css` / `app/layout.tsx` / `app/page.tsx` / `public/assets/`）
- 不改任何运行时
- 不动 `.github/CODEOWNERS`（仍是 4 team 模式，等用户跑 `single-user` 才会改）

## 风险 / 回滚

- **风险点**：`single-user` 模式替换 CODEOWNERS 是破坏性操作（虽然有备份）
  - 缓解：自动备份 `.github/CODEOWNERS.team-mode.bak`，`team-mode` 一键还原
- **风险点**：BLOCKERS.md 里的内容可能过时（解决后忘了删）
  - 缓解：BLOCKERS.md 顶部"已解决"小节，删之前先移到那里
- **回滚方式**：`git revert <commit-hash>` 完全不影响运行时
- **回滚后状态**：4 team 模式保留，single-user 命令已加，BLOCKERS.md 还在

## 后续 TODO

- [ ] 等用户加完协作者后：`git push origin main`（详见 BLOCKERS.md）
- [ ] 加完协作者后：`node scripts/setup-teams.mjs create` + `add-members`
- [ ] 用户想现在就提 PR：`node scripts/setup-teams.mjs single-user hock2022` 切单人模式
- [ ] 多人协作时：跑 `team-mode` 还原 + 建真 team

## 跟其他文档的关系

- 4 团队设置：[`../contributing/team-setup.md`](../../docs/contributing/team-setup.md)
- 4 角色总览：[`../../.harness/INDEX.md`](../../.harness/INDEX.md) 第 8 节
- 当前阻塞：[`../BLOCKERS.md`](../../docs/BLOCKERS.md)
- 提交技能：[`.harness/skills/commit-with-rationale.md`](../../.harness/skills/commit-with-rationale.md)
- 变更报告模板：[`./TEMPLATE.md`](./TEMPLATE.md)
