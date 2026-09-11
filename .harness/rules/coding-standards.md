# 编码规范

## 语言

- TypeScript strict mode 开启（已在 `tsconfig.json`）
- 文件命名：组件 PascalCase，函数 / 工具 camelCase，目录 kebab-case
- 单文件不超过 300 行；超过则拆

## 模块边界

- 跨模块类型放 `src/lib/types.ts`，不放各模块内
- 提示词按席位拆 `src/lib/prompts/seats/<seat>.ts`
- 校验放 `src/lib/validators/`
- 兜底放 `src/lib/fallback/`
- 不引运行时依赖到已有依赖之外的包

## 依赖约束

当前依赖白名单（见 `package.json`）：

- `next` / `react` / `react-dom`
- `openai`（仅服务端 `src/lib/ai/` 使用）
- `zod`

加包前必须：

1. 评估是否能用现有依赖解决
2. 检查是否增加 bundle size（客户端代码）
3. 检查是否在白名单中

## 错误处理

- API 路由统一走 `try / catch`，失败 400 / 500 返回 JSON `{ error: string }`
- 客户端不假设服务端返回结构，必须 Zod 校验
- 服务端不抛裸 `Error`，要么兜底要么返回结构化错误

## 注释

- 中文注释，解释"为什么"而非"是什么"
- 不写行尾装饰
- JSDoc 用于导出的公共 API

## import 顺序

1. 外部包
2. 内部别名（`@/...`）
3. 相对路径

每组之间空一行。
