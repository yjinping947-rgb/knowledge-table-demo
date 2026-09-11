# 本地部署

> 把项目跑在自己机器上。生产部署 / 云端部署看 [`cloud.md`](./cloud.md)。

## 三种模式

### 模式 1：纯前端 demo（最简单）

不需要任何外部服务，AI 自动 fallback 到本地内容。

```bash
npm install
npm run build
npm run start
# → http://localhost:3000
```

适用场景：

- 演示
- 改 UI 时本地验证
- 不需要 LLM 输出
- CI 跑 27 路径回归（CI 用的就是这模式）

### 模式 2：接真实 LLM（推荐）

需要配置 OpenAI 兼容的 API：

```bash
cp .env.example .env.local
# 编辑 .env.local 填 AI_API_KEY / AI_BASE_URL / AI_MODEL
npm run dev
```

环境变量：

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `AI_API_KEY` | 否 | — | 缺失时走 fallback |
| `AI_BASE_URL` | 否 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI 兼容 |
| `AI_MODEL` | 否 | `qwen3-vl-flash` | 模型名 |

`.env.local` 在 `.gitignore` 里，不会被提交。

### 模式 3：接 RAG（20 房间功能）

模式 2 之上加 RAG 用的 embedding 服务（默认走 `AI_BASE_URL`）：

```bash
# 必须有 AI_API_KEY
npm run start
curl "http://localhost:3000/api/answer"
# → { rooms: [20 rooms...] }

curl -X POST http://localhost:3000/api/answer \
  -H "content-type: application/json" \
  -d '{"question": "我该裸辞吗？", "k": 4}'
```

数据：

- `src/data/rag-corpus.json`：28 条知乎问答语料
- `src/data/rag-embeddings.json`：28 × 1536 维向量

如果换语料，重新跑 `.tmp/embed-corpus.mjs` 生成 embeddings（要 API）。

## 健康检查

```bash
# 服务起来了
curl -s http://127.0.0.1:3000 -o /dev/null -w "%{http_code}\n"
# 200

# 3 路径第一轮（最简的端到端验证）
curl -s -X POST http://127.0.0.1:3000/api/discuss \
  -H "content-type: application/json" \
  -d '{"round":1,"firstChoice":"support_quit","secondChoice":null,"respondedSeatIds":[]}'
# {"selectedSeatId":"realist","reply":"...","hostComment":"...","sourceIds":["S04","S05"],"mode":"ai"}

# 27 路径核心回归
node tests/core-branches.mjs
# PASS: 3 first-round branches, 9 combined branches, 27 summaries, source constraints, length limits, invalid input
```

## 常见问题

### 端口被占

```bash
# Linux / macOS
lsof -i:3000
kill -9 <pid>

# Windows
netstat -ano | findstr :3000
taskkill /F /PID <pid>

# 或者改端口
PORT=3001 npm run dev
```

### build 失败：next can't find module

```bash
rm -rf .next
npm run build
```

### AI 调用超时

`src/lib/ai/client.ts` 默认 12s 超时。可调大，但也要相应调长 commit-msg 钩子（如果有）。

### husky 钩子没生效

```bash
npm run prepare
git config core.hooksPath .husky  # Windows 上有时需要
```

### Windows PowerShell 下 `&&` 报错

用 `;` 或 `if ($?)` 替代：

```powershell
npm run start; Start-Sleep 5; node tests/core-branches.mjs
```

## 资源占用

- 内存：开发 ~300MB，生产 ~150MB
- 磁盘：`node_modules` ~500MB，`.next` ~50MB
- 端口：3000

## 关闭服务

```bash
# 前台
Ctrl+C

# 后台（如果用 npm run start &）
lsof -i:3000 | tail -1 | awk '{print $2}' | xargs kill -9  # macOS / Linux
# Windows
Get-Process node | Where-Object { $_.Path -like "*node_modules*next*" } | Stop-Process -Force
```

或者用 PID 文件（如果项目配了）：

```bash
# 已有 next.pid / next.out / next.err（.gitignore）
kill $(cat next.pid)  # macOS / Linux
```
