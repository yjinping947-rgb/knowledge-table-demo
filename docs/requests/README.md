# 跨角色需求记录

这个目录是 GitHub Issue / PR 不可用时的共享协作入口，也是需求协作 skill 的仓内 fallback。每条需求使用时间戳命名，例如：

```text
docs/requests/2026-09-13-1430-needs-ui-review.md
```

使用 [TEMPLATE.md](./TEMPLATE.md) 创建记录。状态只能使用 `open`、`in-progress`、`blocked`、`done` 或 `cancelled`。需求记录应包含 owner、背景、验收标准、关联变更报告和最后更新时间。

有 `gh` 且已登录时，可以把同一份 Markdown 内容同步为 GitHub Issue；Issue URL 回填到记录，不把 GitHub Issue 当作唯一真源。禁止在这里写入 Token、密码、Cookie 或 API key。
