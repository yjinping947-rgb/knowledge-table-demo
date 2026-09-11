---
name: knowledge-table-demo
type: project-root
spec: agents.md
generated_by: Mavis (MiniMax Code)
generated_at: 2026-09-11
---

# AGENTS.md · 知识拼桌 Demo

> 本文件是所有 agent 进入本项目的必读入口，符合 [agents.md](https://agents.md/) 规范。
> 子目录可放 `AGENTS.md` 做局部覆盖。

## 1. 项目一句话

围绕"年轻人该不该裸辞？"做两轮 AI 结构化讨论 Demo。三个观点席位（action / realist / conditional）由多篇相似回答融合，并非真实答主。

## 2. 必读顺序

进入本项目的 agent 必须先读：

1. 本文件
2. [`.harness/INDEX.md`](./INDEX.md) — 单一事实源：谁负责什么
3. 任务相关的 [`.harness/rules/`](./rules/) 之一
4. 涉及角色时，读对应 [`.harness/agents/`](./agents/) 之一

## 3. 启动 & 验证

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start  # 生产模式
node tests/core-branches.mjs   # 27 路径核心回归（需先 start）
```

## 4. 目录地图

| 路径 | 作用 | 变更权限 |
|---|---|---|
| `app/` | Next.js App Router | 仅改 import |
| `src/` | 业务代码（user/agents/client/lib/data） | 可改 |
| `components/` | 薄壳 re-export | 仅 re-export |
| `tests/` | 核心分支回归 | 可改 |
| `public/assets/` | 静态资源（刘看山插图） | **冻结** |
| `app/globals.css` | 样式（48 个 class） | **冻结** |
| `app/layout.tsx` / `app/page.tsx` | 根布局/首页 | **冻结** |
| `.harness/` | 治理层 | 改时同步 INDEX.md |

## 5. 核心约束

- **UI 不变性**（[`rules/ui-invariance.md`](./rules/ui-invariance.md)）：55 个 CSS class 全部保留，stage 数量保持 8 个
- **隐私**（[`rules/privacy.md`](./rules/privacy.md)）：`AI_API_KEY` 只在服务端使用
- **兜底**（[`rules/fallback-policy.md`](./rules/fallback-policy.md)）：缺 key / 解析失败 / 校验失败时必须走 fallback
- **提交**（[`rules/commit-policy.md`](./rules/commit-policy.md)）：conventional commits，commitlint 校验

## 6. 角色索引

详见 [`.harness/INDEX.md`](./INDEX.md) 第 2 节。

## 7. 评审与变更

任何 agent 修改本目录（`.harness/`）下文件时，必须：

- 保持 frontmatter 完整
- 同步 INDEX.md 的对应行
- 跑 `node tests/core-branches.mjs` 验证
- 改 UI 相关文件时必须先读 `rules/ui-invariance.md`
