---
name: 🐛 Bug 报告
about: 跑不起来、跑错了、UI 错了、AI 答非所问
title: "[Bug] "
labels: ["bug", "needs-triage"]
assignees: []
---

## 现象

<!-- 一句话描述 bug：什么场景下发生了什么。 -->

## 复现步骤

<!--
1. 打开 http://localhost:3000
2. 第一轮选 "支持裸辞"
3. 点击 "看行动派怎么说"
4. 看到回复是 "..."（实际上应该是 "..."）
-->

## 期望

<!-- 你期望看到什么。 -->

## 实际

<!-- 你实际看到什么。 -->

## 截图 / 录屏 / 日志

<!-- 如果有截图、录屏、next.log 片段、控制台报错，粘这里。 -->

## 环境

- Node 版本：`node -v` 输出
- 浏览器 / 系统：
- 是开发模式 (`npm run dev`) 还是生产模式 (`npm run build && npm run start`)？
- 有没有 `AI_API_KEY`？（key 本身不要贴在这里）
- `mode: "ai"` 还是 `mode: "fallback"`？（看控制台或 Network 面板的响应）

## 可能的原因

<!--
- 你怀疑是哪个 agent 出了问题？（director / action / realist / conditional / user）
- 是路由问题（`src/agents/director/router.ts`）？
- 是 fallback 问题（`src/lib/fallback/`）？
- 是 UI 不变性破坏（`src/client/` 改了 className）？
- 是契约破坏（`app/api/*/route.ts` 返回结构变了）？
-->
