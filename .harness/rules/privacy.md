# 隐私与密钥

## 强约束

- `AI_API_KEY` / `AI_BASE_URL` **只在服务端**使用
- 客户端代码（`src/client/`、`components/`）**禁止**引用 `process.env.AI_*`
- API 路由（`app/api/*/route.ts`）是密钥唯一使用入口
- 浏览器从响应中看不到任何密钥痕迹

## 配置

- `.env.example` 提供模板
- `.env.local` 在 `.gitignore` 内，禁止提交
- 缺 key 时自动 fallback（见 [`fallback-policy.md`](./fallback-policy.md)），不抛错

## 验证

```powershell
# 客户端代码不得出现 AI_API_KEY / AI_BASE_URL
Select-String -Path src\client, components -Pattern 'AI_API_KEY|AI_BASE_URL' -Recurse
# 必须空结果
```

## 错误信息

服务端错误信息可以包含调试细节（如"模型超时"），但：

- 不包含 key 字符串
- 不包含 baseURL 完整值
- 客户端展示时只显示"网络繁忙，请稍后再试"之类的话术
