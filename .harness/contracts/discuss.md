# 契约 · discuss

## 路由

`POST /api/discuss`

## 请求

```ts
{
  round: 1 | 2;
  firstChoice: 'support_quit' | 'oppose_quit' | 'depends';
  secondChoice?: 'leave_now' | 'wait_offer' | 'set_deadline' | null;
  respondedSeatIds: ('action' | 'realist' | 'conditional')[];
}
```

校验见 `src/lib/validators/discuss.ts`

## 响应 200

```ts
{
  selectedSeatId: 'action' | 'realist' | 'conditional';
  reply: string;        // ≤ 140 字（实际 ≤ 100）
  hostComment: string;  // ≤ 100 字（实际 ≤ 70）
  sourceIds: string[];  // 1-3 个，必须在 selectedSeatId 的绑定列表内
  mode: 'ai' | 'fallback';
}
```

## 响应 400

```ts
{ error: '请求参数不完整' }
```

## 失败兜底

- 缺 AI 配置 → 直接 `getDiscussFallback` 返回
- 模型超时（12s）/ 解析失败 / 校验失败 / sourceIds 越界 → 兜底
- `process.env.NODE_ENV === 'development'` 时 `console.error` 一次

## 反约束

- 不缓存响应
- 不写数据库
- 不返回密钥痕迹
- 选中的 sourceIds 必须 hard 校验在席位绑定列表内

## 调用方

- `src/client/knowledge-table/` 的 `chooseFirst` / `chooseSecond`
