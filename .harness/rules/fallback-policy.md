# 兜底策略

## 触发条件

以下任一情况触发 fallback：

1. `AI_API_KEY` 或 `AI_BASE_URL` 缺失
2. `getAIClient()` 返回 `null`
3. 模型超时（> 30s）
4. 输出无法 `JSON.parse`
5. `Zod` schema 校验失败
6. `sourceIds` 越界（不在选中席位的绑定列表内）

## 兜底内容

- `getDiscussFallback(round, firstChoice, secondChoice?)` 提供第一轮 3 选 1 + 第二轮 9 选 1
- `getSummaryFallback(firstChoice, secondChoice, positionChange)` 提供 summary 兜底
- 兜底内容必须在结构上与 AI 输出一致，`mode: "fallback"` 区分

## 兜底不可缺席

- 兜底缺失本身是 bug
- CI 必须跑 `tests/core-branches.mjs` 验证兜底链路
- 新增 AI 调用路径必须同步提供 fallback

## 写作要求

详见 [`skills/author-fallback.md`](../skills/author-fallback.md)

## 兜底内容存放

- `src/lib/fallback/discuss.ts` — 两轮讨论兜底
- `src/lib/fallback/summary.ts` — 总结兜底
- 兜底内容用 `Record<...>` 索引，确保类型完整
