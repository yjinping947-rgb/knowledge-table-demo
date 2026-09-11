# 云端部署

> ⚠️ **占位文档** — 计划将本地部署改为云端部署时再具体化。
> 当前建议保持本地部署（详见 [`local.md`](./local.md)），等 27 路径测试 + 性能 / 成本预估跑通后再迁。

## 候选平台（待评估）

| 平台 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| **Vercel** | Next.js 一等公民，零配置 | serverless 函数有时长限制 | demo / 小流量 |
| **Cloudflare Pages + Workers** | 边缘部署 + KV 缓存，量大便宜 | serverless 函数 API 与 Vercel 不完全一致 | 中等流量 + 国际化 |
| **自建 Docker**（阿里云 / AWS / 自家机房） | 完全控制 + 无 vendor lock-in | 要自己管 CI/CD、监控、扩缩容 | 合规 / 大流量 |
| **Deno Deploy** | 边缘 + 长连接 | 不是 Next.js 原生 | 边缘 + 长连接场景 |

## 待确认问题

迁云端前要回答：

- [ ] 27 路径测试在 serverless 环境是否仍能跑？（每次冷启动 12s 内完成 AI 调用吗？）
- [ ] `AI_API_KEY` 怎么管理？环境变量 vs secret manager？
- [ ] `src/data/rag-embeddings.json` 28×1536 维是否要迁到向量数据库？（Pinecone / Milvus / pgvector）
- [ ] CI 的 `npm run start` + `node tests/core-branches.mjs` 怎么改成云端验证？
- [ ] 性能 / 成本预估：日活 1000 的成本？日活 10000？
- [ ] 监控 / 告警：AI 调用失败率、fallback 占比、平均延迟

## 通用迁移步骤（任何平台）

```
1. 确认云端环境跑得通 27 路径测试
2. 确认 .env 变量从 secret manager 读（不是 .env.local）
3. 配置 CDN / 缓存（Next.js 默认带 ISR，但 /api/* 要单独处理）
4. 配监控（OpenTelemetry → 任意 APM）
5. 配日志（Next.js → CloudWatch / Logflare）
6. 配告警（AI 调用失败率 > 5% 告警）
7. 灰度（10% → 50% → 100%）
8. 回滚预案（前一版本镜像 + 数据库快照）
```

## 折中方案（不上云）

如果只是想让别人能用：

- **Vercel Preview**：每个 PR 自动部署一个 preview URL
- **Ngrok / Cloudflare Tunnel**：本地起服务，临时公网可访问
- **自建 Docker**：打镜像，给团队内部用

## 何时回到本文档

- 单 demo 流量上来（> 1000 DAU）
- 想接 RAG + 向量数据库
- 想接 SSO / 多租户

到时再细化每个平台的步骤。

## 进度

- [x] 调研候选平台（本节）
- [ ] 选平台
- [ ] PoC（部署一个分支验证 27 路径 + AI 接入）
- [ ] 性能 / 成本预估
- [ ] 灰度上线
