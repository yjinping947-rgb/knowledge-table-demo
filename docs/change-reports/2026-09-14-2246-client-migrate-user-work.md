# 完成 3011 主线的语料融合与互动流程

| 字段 | 值 |
|---|---|
| 日期 | 2026-09-14 |
| 时间戳 | 22:46 |
| 作者 | @yjinping947-rgb |
| 关联 PR | 待推送后创建 |
| 关联 commit | 本地提交（以 `git log -1` 为准） |
| 影响模块 | `app/api`, `src/client/knowledge-table`, `src/lib/session`, `src/lib/zhihu`, `src/lib/rag`, `src/data/topics.json` |
| 影响契约 | `src/lib/types.ts`, `src/lib/validators/*` |

## 背景

3011 是最新 main 的独立体验分支，需要吸收 3004 已完成的语料检索、主题隔离、用户追问和互动流程，同时保留 3011 的碰撞点、质疑/回应、分歧和第三席主线。此前两席上下文传递不完整，模型超时后又容易落到相似兜底文案；加载时间较长时用户也不清楚系统是否卡住。

## 变更前预期

### 用户行为
- 20 个正式话题和自定义问题都能进入同一条讨论流程。
- 两席观点应围绕当前话题和用户补充条件生成，第二席能针对第一席形成清晰差异。
- 实时知乎不可用时仍能按当前主题/席位安全降级。
- 慢请求期间显示轻量等待反馈；用户可选择敲木鱼或继续普通加载。

### 数据 / API
- `/api/discuss`、`/api/followup`、`/api/collision`、`/api/divergence`、`/api/perspective`、`/api/summary` 共享当前会话上下文。
- 知乎实时检索优先，当前主题本地语料只在结果不足时补齐。
- Secret、API Key 和本地 `.env.local` 不进入前端或仓库。

### 兼容性
- 保留 3011 原有碰撞点、质疑/回应、隐藏分歧、第三席和总结流程。
- 保留 action / realist / conditional 内部 Agent ID；只按主题调整用户可见名称。
- 不直接修改 `main`，本次只推送 `feat/client-migrate-user-work`。

### 性能 / 安全
- 知乎搜索和聊天模型设置有限超时、关闭自动重试，失败后走可解释降级。
- 实时搜索结果使用已有本地 TTL 缓存，缓存不保存凭证。

## 改了什么

- `src/lib/zhihu/realtime.ts`：知乎 CLI 实时搜索、主题过滤、缓存和混合来源状态。
- `src/lib/session/rag.ts`、`src/lib/session/agent.ts`：实时优先检索、主题/席位提示词、用户上下文和上下文差异约束。
- `app/api/discuss/route.ts`：20 主题、自定义问题、第二席读取上一席发言、相似度保险和主题化兜底。
- `app/api/collision/route.ts`：先生成质疑再生成回应，双方首轮发言、用户追问和来源状态完整传递。
- `app/api/divergence/route.ts`、`app/api/perspective/route.ts`、`app/api/summary/route.ts`：贯穿用户补充、初步判断和节点流总结。
- `src/client/knowledge-table/*`：逐席展示、追问回退、点赞收录、第三席占位、按主题命名、初步判断校准和加载提示。
- `src/client/knowledge-table/components/LoadingGame.tsx`：轻量可选敲木鱼，功德 +1；只有明确选择“好，敲木鱼”时，加载完成后才提供继续敲或回到讨论，选择“不用”不会在完成后重新弹出游戏。
- `src/data/topics.json` 及语料审计脚本：20 话题、席位限定、清洗/去重/串台检查和补充任务记录。
- `src/lib/ai/client.ts`、`src/lib/rag/client.ts`：收紧模型/Embedding 超时和重试，避免长时间阻塞。

## 变更后验证效果

### 自动化测试
- `npm run lint`：通过，3 条既有 warning（语料脚本未使用变量、旧文案参数、Next 内部导航提示），0 error。
- `npm run typecheck`：通过。
- `npm run build`：通过，Next 16.3.4 production build 成功。
- `npm run harness:check`：通过（4 个协作 skill wired）。
- `npm run test:all`：默认脚本固定请求 3000；当前 3011 开发服务占用项目锁，3000 启动被 Next 拒绝，因此默认命令连接失败，不属于接口断言失败。使用 `BASE_URL=http://127.0.0.1:3011` 复核核心接口可返回 200。

### 手动验证
- `GET http://127.0.0.1:3011/?topic=T12`：HTTP 200。
- `/api/discuss`（T08）：返回 `sourceStatus=zhihu-realtime`，主题名称为“能力转化派 / 门槛审慎派”。
- `/api/collision`：双方返回 200，来源状态正确传递；回应输入包含刚生成的质疑原文。
- 加载组件：先询问是否玩木鱼；选择否保持普通加载，选择是显示小木鱼；完成后提供“继续敲 / 回到讨论”。
- 加载组件边界回归：选择“不用”后完成态不再显示游戏卡片；选择“好，敲木鱼”后保留“继续敲 / 回到讨论”。

## 变更原因评论

3011 现在以最新 main 为主线吸收了 3004 的语料和互动能力，实时知乎优先、本地主题语料安全补齐，并修复了两席缺少上下文导致的同质回答。自动类型检查、构建和治理检查通过；唯一需要团队后续关注的是当前测试脚本的默认端口与本地开发端口不一致。

## 风险 / 回滚

- 风险：模型服务响应慢时仍会进入主题化 fallback；这保证流程可走完，但回答细节少于实时 AI 模式。
- 风险：当前分支包含较大范围的 3011 融合改动，合并前应由队友完整体验一次主流程。
- 回滚：`git revert <commit>`，或暂不合并该分支。

## 后续 TODO

- [ ] 将测试脚本默认端口改为读取统一 `BASE_URL` / 项目启动配置。
- [ ] 模型端点稳定后复测两席实时生成和碰撞阶段的 AI 模式。
- [ ] 推送 `feat/client-migrate-user-work` 后创建 PR，团队审核后再合并到 main。
