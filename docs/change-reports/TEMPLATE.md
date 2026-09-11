# 变更报告模板

> 复制这份模板到 `docs/change-reports/YYYY-MM-DD-<slug>.md`，把 `<>` 替换为实际内容。

---

# <一句话变更主题>

<!--
例如：拆分目录与搭建治理层 / 接入本地 RAG 检索 / 加 20 个房间功能
-->

| 字段 | 值 |
|---|---|
| 日期 | YYYY-MM-DD |
| 作者 | @<github-handle> |
| 关联 PR | #<number> |
| 关联 commit | `<short-hash>` |
| 关联 issue | #<number>（如有） |
| 影响模块 | `<列出 src/agents/X, app/api/X, ...>` |
| 影响契约 | `<列出 .harness/contracts/X, src/lib/types.ts>` |

## 背景

<!--
- 之前是什么状态？
- 为什么要改？（用户痛点 / 性能 / 合规 / 治理）
- 改之前踩过什么坑？
-->

## 变更前预期

<!--
改之前写下"我预期这次改完会怎样"。哪怕只 3 行也要写。这迫使作者在动手前先想清楚目标。

模板：

### 用户行为
- 选 X 时，预期 Y 发生
- ...

### 数据 / API
- 接口入参：...
- 接口出参：...
- ...

### 兼容性
- 是否破坏向后兼容？
- 是否要 deprecate 老路径？
- ...

### 性能 / 安全
- 预期改进 / 风险点：...

### Harness 影响
- 触及哪些 agent？
- 触及哪些 rules / skills / contracts？
- ...

-->

## 改了什么

<!--
代码层面改了哪些文件？按目录列。
- `app/api/...`：...
- `src/agents/X/`：...
- `src/lib/...`：...
- `.harness/...`：...
- ...
-->

## 变更后端测效果

<!--
改完之后写下"实际验证下来是什么效果"。要具体到数字。

### 自动化测试
- `npm run lint`：通过 / 失败（N warnings）
- `npm run build`：通过 / 失败（耗时 Xs）
- `node tests/core-branches.mjs`：PASS: 3 first-round branches, 9 combined, 27 summaries（实际输出）
- 单元测试：...

### 手动验证
- 场景 1：选 X → 看到 Y（截图 / 录屏）
- 场景 2：缺 AI_API_KEY → fallback 触发（响应里 mode: "fallback"）
- 场景 3：传非法输入 → 400（响应内容）

### 边界 / 异常
- 超长输入处理：...
- 越界 sourceIds 处理：...
- 网络超时处理：...
-->

## 风险 / 回滚

<!--
- 风险点：...
- 影响范围：... 用户
- 回滚方式：revert commit / 关闭 feature flag / 改配置
- 监控 / 告警：上线后看哪些指标
-->

## 后续 TODO

<!--
- [ ] 下一步要做的（不在本次 PR 范围）
- [ ] 待观察的指标
- [ ] 可能的优化点
-->
