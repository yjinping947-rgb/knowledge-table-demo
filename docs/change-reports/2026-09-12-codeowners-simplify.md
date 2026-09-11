# 简化 CODEOWNERS — 从 5 团队到 3 团队

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 作者 | @always |
| 关联 commit | （本次） |
| 影响模块 | `.github/CODEOWNERS` `docs/contributing/team-setup.md` `.harness/INDEX.md` `CHANGELOG.md` |

## 背景

`db22ac9` 把 CODEOWNERS 从 0 升到 6 个 team（5 角色 + maintainers 兜底），但 admin 成本偏高 —— 3 席位（action/realist/conditional）每个只占 2 个文件，user 域只占 1 个目录，单独建 team 不划算。

`1.1.0` 上线后用户反馈"3 个角色就够了"，决定合并到 3 团队。

## 变更前预期

### 用户行为

- 不变 — review 路由是后台 admin 行为，对外接口 0 影响
- 现有 PR 流程不变

### 数据 / API

- 不变 — 完全不改任何运行时
- 仅改 CODEOWNERS 路由 + 配套文档

### 兼容性

- 完全兼容 — 不删任何现有 team handle，只是合并
- 组织里已经建好的 6 个 team 不需要删，留着备用（如果未来要拆回 5 角色，按需启用）

### Harness 影响

- 不变 —— `.harness/agents/` 仍是 5 角色
- 仅 CODEOWNERS 层 admin 简化
- 加文档说明 review team 数 ≠ agent 角色数

## 改了什么

| 路径 | 改动 |
|---|---|
| `.github/CODEOWNERS` | 6 team → 3 team（`maintainers` + `director-team` + `seats-team`），3 席位 + user 域合到 `seats-team` |
| `docs/contributing/team-setup.md` | 反映 3 team 结构 + 加"review team vs agent 角色"对照表 |
| `.harness/INDEX.md` | 第 8 节标注 review team 数 (3) ≠ agent 角色数 (5) |
| `CHANGELOG.md` | 加 1.1.1 条目 |

## 变更后端测效果

### 自动化测试

- `node tests/core-branches.mjs`：仍 PASS（不受 CODEOWNERS 影响）
- `node tests/rooms-rag.mjs`：仍 PASS
- `npm run lint`：0 warning

### 手动验证

- 检查 CODEOWNERS：所有文件路径都被某条规则覆盖
- 检查 team 数：3 个（maintainers / director-team / seats-team）
- 检查 5 个 agent 角色都有对应团队负责：
  - director → director-team ✓
  - action / realist / conditional / user → seats-team ✓
- 检查兜底：所有路径都在某条规则里有 owner（`*` 兜底到 maintainers）

### 边界 / 异常

- 如果组织里**没建** `seats-team` —— 改席位 / user 域相关文件不会自动 assign reviewer
- 如果组织里**没建** `director-team` —— 改 director / 客户端 / 基础设施不会自动 assign
- 如果组织里**没建** `maintainers` —— 全部都静默忽略
- **建议**：建组织时优先建 3 team（不建 team = 整个 CODEOWNERS 不生效）

## 风险 / 回滚

- **风险点**：5 角色 → 3 team 的合并可能被误解为"agent 数量减少"
  - 缓解：`team-setup.md` 加了对照表 + INDEX.md 标注 review team 数 ≠ agent 角色数
- **风险点**：原 5 角色占位 handle 删了，未来想拆回 5 团队要从 git 历史里捞
  - 缓解：1.1.0 commit (`db22ac9`) 里 5 角色版本还在
- **回滚方式**：`git revert <commit-hash>` — 完全不影响运行时，回滚后 5 角色 team 占位恢复
- **回滚后状态**：恢复 1.1.0 的 6 team 结构

## 后续 TODO

- [ ] 组织里建 3 team（`maintainers` / `director-team` / `seats-team`），按 `docs/contributing/team-setup.md`
- [ ] 验证 PR 改 `src/agents/action/` 自动 assign `seats-team`
- [ ] 验证 PR 改 `app/page.tsx` 自动 assign `maintainers`

## 事后回顾（预留）

待 review 后补。
