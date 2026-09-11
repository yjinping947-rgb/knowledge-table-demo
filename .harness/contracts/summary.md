# 契约 · summary

## 路由

`POST /api/summary`

## 请求

```ts
{
  firstChoice: 'support_quit' | 'oppose_quit' | 'depends';
  secondChoice: 'leave_now' | 'wait_offer' | 'set_deadline';
  positionChange: 'unchanged' | 'slightly_changed' | 'changed';
  respondedSeatIds: ('action' | 'realist' | 'conditional')[];
}
```

校验见 `src/lib/validators/summary.ts`

## 响应 200

```ts
{
  consensus: string;
  disagreement: string;
  hiddenAssumption: string;
  trajectory: { before: string; during: string; after: string };
  openQuestion: string;
  mode: 'ai' | 'fallback';
}
```

## 响应 400

```ts
{ error: '请求参数不完整' }
```

## 失败兜底

- 缺 AI 配置 / 模型失败 → `getSummaryFallback` 返回
- 同 [`contracts/discuss.md`](./discuss.md) 的失败兜底规则

## 反约束

- 不缓存响应
- 不写数据库
- 不返回密钥痕迹
- `trajectory` 三段都来自 labels 表，不允许 LLM 自由发挥

## 调用方

- `src/client/knowledge-table/` 的 `chooseReflection`
