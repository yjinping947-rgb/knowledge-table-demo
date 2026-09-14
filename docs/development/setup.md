# 本地开发环境搭建

> 第一次跑这个项目？按顺序来。

## 1. 前置依赖

| 工具 | 版本 | 验证命令 |
|---|---|---|
| Node.js | 20.9+ | `node -v` |
| npm | 8+ | `npm -v` |
| Git | 2.30+ | `git --version` |

Windows 推荐用 [nvm-windows](https://github.com/coreybutler/nvm-windows) 或 [fnm](https://github.com/Schniz/fnm) 管理多 Node 版本。

项目已锁 Node 版本为 `20.9`，详见 `.nvmrc`。

## 2. 克隆 + 安装

```bash
git clone <repo-url>
cd knowledge-table-demo
npm install
```

## 3. 跑起来

```bash
# 开发模式（热更新）
npm run dev
# → http://localhost:3000

# 生产模式
npm run build
npm run start
# → http://localhost:3000
```

## 4. 跑测试

```bash
# 27 路径核心回归 + 异常 + 长度边界 + 来源约束
# 需要先 npm run start 跑生产服务
npm run start &
node tests/core-branches.mjs
# 期望输出：PASS: 3 first-round branches, 9 combined branches, 27 summaries, ...

# 单元测试（如果加了）
npm test
```

## 5. AI 配置（可选，但想看真 AI 效果就必须配）

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

填入：

```text
AI_API_KEY=你的密钥
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-flash
```

本项目默认走 **DeepSeek**。任何 OpenAI 兼容网关都可用 —— 换 `AI_BASE_URL` 与
`AI_MODEL` 即可。

> ⚠️ `.env.local` 已被 gitignore，**你的 key 不会被提交到仓库**。
> 请勿把 key 写进 `.env.example` 或任何被跟踪的文件。

不填也能跑 —— 缺 key 时自动 fallback，体验不中断。但要注意：**fallback 状态下
回答是模板/语料摘录，不是真 AI 生成**。响应的 `mode` 字段会如实标注：

| mode | 含义 |
|---|---|
| `generated` | 真 AI 生成（这才是你要的） |
| `retrieval` | 仅返回来源摘录（LLM 调用失败） |
| `fallback` | 规则兜底 |

若看到回答明显变短、像模板，先检查 `mode` 是不是 `generated`。

## 6. 钩子初始化

`npm install` 会自动跑 `husky` 准备脚本。如果钩子没生效：

```bash
npm run prepare
```

钩子跨平台用 Node 脚本，Windows / macOS / Linux 都能跑。

## 7. 验证

跑通下面这串就算 OK：

```bash
npm run lint         # eslint 通过
npm run build        # next build 通过
npm run start &      # 启服务
sleep 5
curl -s http://127.0.0.1:3000 > /dev/null && echo "OK"
node tests/core-branches.mjs  # 27 路径全绿
```

## 常见问题

### Windows 上 husky 钩子不触发

`git config core.hooksPath` 必须指向 `.husky/`。如果跑 `npm run prepare` 后还是不行：

```powershell
git config core.hooksPath .husky
```

### pre-commit 跑测试太慢

`pre-commit.mjs` 默认跑 `npm test`（`node --test tests/*.test.mjs`）。如果以后加了慢测试，建议改用 [lint-staged](https://github.com/okonet/lint-staged) 只跑已暂存文件。

### 端口 3000 被占

```bash
# 改端口
PORT=3001 npm run dev
```

### 改了 `.harness/` 下的文件但 hooks 没报错

钩子只校验 commit 消息格式 + 跑测试。改了 `.harness/` 不会被自动校验。要靠：
- 读 `.harness/INDEX.md`（"改 .harness/ 下任何文件前，先看这里"）
- 跑 `node tests/core-branches.mjs`（27 路径验证 harness 没破坏）
- 提 PR 时写"影响范围"说明

## 下一步

- 改代码？看 [`workflow.md`](./workflow.md)
- 提 PR？看 [`../contributing/how-to-pr.md`](../contributing/how-to-pr.md)
- 部署？看 [`../deployment/local.md`](../deployment/local.md)
