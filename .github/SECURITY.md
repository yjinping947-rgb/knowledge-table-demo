# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a Vulnerability

**请不要在公开 issue / discussion / PR 里披露安全漏洞。**

私密上报：

1. 打开 [Security Advisories](https://github.com/MiniMax/knowledge-table-demo/security/advisories/new)
2. 填漏洞详情（影响范围 / 重现步骤 / 修复建议）
3. 48 小时内会有人 review
4. 修复后会公开致谢（除非你要求匿名）

## 安全设计要点

本项目是 demo，安全设计原则：

- **`AI_API_KEY` / `AI_BASE_URL` 只在服务端**（`app/api/*/route.ts`），客户端代码不引用
  - 详见 `.harness/rules/privacy.md`
- **不缓存 API 响应**（避免敏感信息落盘）
- **不写数据库**（项目无持久化层）
- **不返回密钥痕迹**（服务端错误信息不包含 key / baseURL）
- **AI 输出不信任**：用 Zod 校验 + 长度边界 + sourceIds 越界检查
  - 详见 `.harness/rules/fallback-policy.md`
- **依赖管理**：Dependabot 每周一开 PR，关键依赖（next / react）major 走人工 review
  - 详见 `.github/dependabot.yml`

## 已知限制

- demo 性质，没有生产级安全审计
- 9 条来源是模拟数据，不是真实知乎链接
- AI 输出可能编造（虽 prompt 禁止）—— 始终当 LLM 不可信
- 没有 rate limiting（demo 用，无外部用户）
- 没有 SSO / 鉴权（无登录系统）

## 如果你发现

- 密钥泄露（`.env.local` 不小心提交等）→ 立刻私信 maintainer
- 依赖有已知 CVE → 在 issue 里发 [security] 标签
- AI 输出越界 / 提示词注入 → 在 issue 里发 [security] 标签，附完整 prompt 和输出

## Credits

报告过安全问题的贡献者会出现在这里（如果你愿意署名）。
