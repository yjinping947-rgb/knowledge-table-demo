# Skill 总览

> 项目里所有 4 个 skill 的快速参考。详细用法看对应文件。

## 4 个 skill 一览

| # | Skill | 何时用 | 关键产物 |
|---|---|---|---|
| 1 | [`commit-with-rationale`](../../../.harness/skills/commit-with-rationale.md) | 每次 `git commit` 前 | 时间戳命名的 change report + commit + PR |
| 2 | [`deploy-app`](../../../.harness/skills/deploy-app.md) | 部署到本地 / 云端 | 启动服务 + 健康检查 + 回滚 |
| 3 | [`request-from-teammate`](../../../.harness/skills/request-from-teammate.md) | 跨角色协作（提需求 / 扫需求） | issue / PR @ + label |
| 4 | [`add-corpus`](../../../.harness/skills/add-corpus.md) | 加新语料 | `src/data/topics.json` 更新 + embedding |

## 关系图

```
                        commit-with-rationale
                              ↓
        ┌──────────── request-from-teammate ────────────┐
        ↓                     ↓                        ↓
   add-corpus  →   commit-with-rationale   ←   deploy-app
        ↓                     ↓
   1175 语料              change report
                              ↓
                          deploy-app
```

- **add-corpus** 完成后 → 用 **commit-with-rationale** 提交（附 build 输出）
- **deploy-app** 前 → 用 **request-from-teammate** 扫一下别人有没有衍生需求
- **request-from-teammate** 触发后 → 别人用 **commit-with-rationale** 提交响应

## 4 个角色如何用

```bash
# 1. 打开你的角色文件
cat .harness/roles/<your-role>.md
# agent-dev / ui-design / feature-design / corpus

# 2. 跑对应 skill
#   - 所有人：commit-with-rationale
#   - 跨人协作：request-from-teammate
#   - corpus 角色：add-corpus
#   - 部署时：deploy-app
```

## 命名约定

文件名（skill）：`<verb>-<object>.md`

- `commit-with-rationale` — verb + modifier + object
- `deploy-app` — verb + object
- `request-from-teammate` — verb + modifier + object
- `add-corpus` — verb + object

跟现有 skill（`author-fallback` / `write-seat-reply` / `write-change-report` / `generate-summary-map`）一致。

## 时间戳约定

change report 文件名：`YYYY-MM-DD-HHMM-<slug>.md`

- 例：`2026-09-12-1430-fix-router-fallback.md`
- 同一分钟可加后缀：`2026-09-12-1430-fix-router-fallback-2.md`
- 见 [`commit-with-rationale`](../../../.harness/skills/commit-with-rationale.md) 详细说明

## 跟其他文档的关系

- 4 角色总览：[`cross-role-workflow.md`](./cross-role-workflow.md)
- 提 PR：[`how-to-pr.md`](./how-to-pr.md)
- 提 issue：[`how-to-issue.md`](./how-to-issue.md)
- commit 规范：[`commit-conventions.md`](./commit-conventions.md)
- 变更报告模板：[`../change-reports/TEMPLATE.md`](../change-reports/TEMPLATE.md)
