# 知识拼桌 Demo

围绕“年轻人该不该裸辞？”的两轮 AI 结构化讨论 Demo。三个席位是由多篇相似回答融合成的观点集合，并非真实答主。当前 9 条来源均为明确标注的模拟数据，不包含虚假知乎链接。

## 启动

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。正式运行可使用：

```bash
npm run build
npm run start
```

## AI 配置

复制 `.env.example` 为 `.env.local`，填写阿里云百炼所属地域与业务空间对应的 OpenAI 兼容地址：

```text
AI_API_KEY=你的密钥
AI_BASE_URL=你的兼容接口地址
AI_MODEL=qwen3-vl-flash
```

AI 只在服务端的 `/api/discuss` 与 `/api/summary` 中调用，浏览器不会获得密钥。`AI_API_KEY` 或 `AI_BASE_URL` 任一缺失时自动进入演示模式；接口超时、输出解析失败、字段或来源校验失败时同样自动使用兜底内容，体验不会中断。

## 验证

启动生产服务后运行：

```bash
node tests/core-branches.mjs
```

测试覆盖三种第一轮选择、全部九种两轮组合、九张个性化讨论地图、席位来源约束和非法输入。项目不包含数据库，刷新即重新开始；“再坐一桌”会清空前端状态。
