# Skill · 部署（本地 + 云端）

## 何时加载

- 准备把代码部署到本地环境验证
- 准备部署到云端
- 部署后回滚

## 工作流总览

```
本地开发 → 本地部署验证 → (可选) 云端部署
   ↑                                  ↓
   └──────── 失败 / Bug ←───────────────┘
```

## 模式 1：本地开发（dev server）

适用：边改边看效果。

```bash
npm run dev
# → http://localhost:3000
# Next.js 16.3.4 热更新
```

健康检查：

```bash
curl -s http://127.0.0.1:3000 -o /dev/null -w "%{http_code}\n"
# 200
```

关闭：`Ctrl+C`（前台）或 `Stop-Process`（后台进程）。

## 模式 2：本地生产模式（local prod）

适用：模拟生产环境、本地端到端测试。

```bash
# 1. 编译
npm run build
# Next.js 编译 + TypeScript 校验

# 2. 启生产服务
npm run start
# → http://localhost:3000

# 3. 跑端到端测试
npm run test:core    # 27 路径核心回归
npm run test:rag     # 8 RAG 路径
npm run test:all     # 全部
```

### 一键全检查（推荐）

部署前**只跑一条命令**就能跑完 lint + typecheck + build + 测试：

```bash
# 1. 加这个脚本到 package.json（首次设置）
#    "check:all": "npm run lint && npm run typecheck && npm run build"

# 2. 部署前跑
npm run check:all
# 等价于：
#   npm run lint      # eslint
#   npm run typecheck  # tsc --noEmit
#   npm run build      # next build（含运行 TS 校验）
#   npm run test:all   # 27 路径 + 8 RAG（需要先 npm run start）
```

> 实战经验：手动跑 4 个独立命令（lint / typecheck / build / test:all）太烦，封装成 `check:all` 一键搞定。

> ⚠️ `test:all` 需要 `npm run start` 跑生产服务。如果只是想验证代码（不开服务），用 `npm run test`（单元测试，本项目无 .test.mjs 文件）即可。

Windows 后台启动（写 next.out / next.err 日志）：

```powershell
Start-Process -FilePath "npm.cmd" -ArgumentList "run","start" `
  -RedirectStandardOutput "next.out" -RedirectStandardError "next.err" `
  -WindowStyle Hidden -PassThru
```

关闭服务：

```powershell
# 找进程
Get-NetTCPConnection -LocalPort 3000 -State Listen
# 杀进程
Stop-Process -Id <pid> -Force
```

## 模式 3：CI 部署（GitHub Actions）

适用：每个 push / PR 自动跑。

详见 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)：

- 触发：`push` 到 `main` / `pull_request` 到 `main`
- 步骤：lint → build → 启动服务 → 跑 `core-branches.mjs` + `rooms-rag.mjs` → 上传日志
- 缓存：npm 缓存

## 模式 4：云端部署（占位）

> ⚠️ 当前项目是 demo，**只在本地跑**。云端部署是占位 — 真要上云时再具体化。
> 详见 [`docs/deployment/cloud.md`](../../docs/deployment/cloud.md)。

候选平台：

| 平台 | 适用 | 何时选 |
|---|---|---|
| Vercel | demo / 小流量 | 想 5 分钟上线，零配置 |
| Cloudflare Pages + Workers | 中等流量 + 边缘 | 想要边缘部署 + 长连接支持 |
| 自建 Docker | 大流量 / 合规 | 需要完全控制 |
| Deno Deploy | 边缘 + 长连接 | 已有 Deno 经验 |

通用迁移步骤（任何平台）：

```
1. 确认云端环境跑得通 27 路径测试
2. .env 变量从 secret manager 读（不是 .env.local）
3. CDN / 缓存配置（Next.js ISR 默认有，/api/* 单独处理）
4. 监控：OpenTelemetry → 任意 APM
5. 日志：Next.js → CloudWatch / Logflare
6. 告警：AI 调用失败率 > 5% 告警
7. 灰度：10% → 50% → 100%
8. 回滚：前一版本镜像 + 数据库快照
```

## 部署前检查清单

每次部署前必跑：

- [ ] `npm run lint` 通过
- [ ] `npm run build` 通过（TypeScript 校验）
- [ ] `npm run test:all` 27 路径 + 8 RAG 路径全绿
- [ ] `.env.local` 配了 `AI_API_KEY` 和 `AI_BASE_URL`（prod 模式）
- [ ] `docs/change-reports/` 最近的报告都已 merge
- [ ] `git status` 无未提交改动
- [ ] 当前 commit 在 main / develop

## 部署后健康检查

```bash
# 1. 服务可访问
curl -sI http://<host>:3000 | head -1
# HTTP/1.1 200 OK

# 2. 关键 API
curl -s -X POST http://<host>:3000/api/discuss \
  -H "content-type: application/json" \
  -d '{"round":1,"firstChoice":"support_quit","secondChoice":null,"respondedSeatIds":[]}' | jq .

# 3. RAG API
curl -s -X POST http://<host>:3000/api/answer \
  -H "content-type: application/json" \
  -d '{"question":"我该裸辞吗？"}' | jq .

# 4. 跑测试脚本（如果在 CI 已跑，可跳过）
node tests/core-branches.mjs
node tests/rooms-rag.mjs
```

## 回滚

| 场景 | 回滚方式 |
|---|---|
| 单个 commit 引入 bug | `git revert <commit>` 然后重部署 |
| 多个 commit 复杂 bug | `git reset --hard <known-good-commit>` 然后重部署 |
| 配置错误 | 回滚 `.env.local` / cloud secret |
| 数据问题 | 不在本文档范围（demo 无数据库） |

回滚后必跑：

- [ ] 健康检查通过
- [ ] 关键 API 200
- [ ] 27 路径 + 8 RAG 路径全绿

## 监控 / 告警（生产环境必加）

| 指标 | 阈值 | 告警方式 |
|---|---|---|
| 服务可用性 | < 99% | PagerDuty / 钉钉 |
| API 延迟 (P95) | > 3s | Slack |
| AI 调用失败率 | > 5% | Email |
| Fallback 占比 | > 50% | Slack（说明 LLM 出问题） |
| RAG 命中率 | < 70% | Slack（说明语料或 embedding 出问题） |

## 跟其他文档的关系

- 本地部署详细：[`docs/deployment/local.md`](../../docs/deployment/local.md)
- 云端部署占位：[`docs/deployment/cloud.md`](../../docs/deployment/cloud.md)
- 健康检查命令：[`docs/development/setup.md`](../../docs/development/setup.md)
- 工作流：[`docs/development/workflow.md`](../../docs/development/workflow.md)
- 提交技能：[`.harness/skills/commit-with-rationale.md`](./commit-with-rationale.md)
- 提需求技能：[`.harness/skills/request-from-teammate.md`](./request-from-teammate.md)
