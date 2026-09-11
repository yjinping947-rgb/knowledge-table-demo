# Skill · 写兜底

## 何时加载

修改 `src/lib/fallback/` 或新增 AI 调用路径需要兜底时。

## 兜底原则

1. **结构对齐 AI 输出**：每个字段都必须存在且类型一致
2. **不假设 AI**：内容应是"导演也能接受的"中立表述
3. **可读优先**：用日常中文，避免堆术语
4. **不评价**：不说"应该""建议"，只描述"你现在的选择意味着什么"

## 兜底生成检查清单

- [ ] `mode: "fallback"`
- [ ] `sourceIds` 全部落在选中席位的绑定列表内
- [ ] `reply` ≤ 100 字
- [ ] `hostComment` ≤ 70 字
- [ ] summary 字段不超 100 字
- [ ] 27 路径全部有兜底（3 + 9 + 9 + 6 = 27）
- [ ] CI 跑 `tests/core-branches.mjs` 全绿

## discuss 兜底结构

```ts
const first: Record<FirstChoice, DiscussResult> = {
  support_quit: { selectedSeatId, reply, hostComment, sourceIds, mode: "fallback" },
  oppose_quit: { ... },
  depends: { ... }
};

const second: Record<FirstChoice, Record<SecondChoice, DiscussResult>> = {
  support_quit: {
    leave_now: { ... },
    wait_offer: { ... },
    set_deadline: { ... }
  },
  // ...
};
```

## summary 兜底结构

```ts
function getSummaryFallback(firstChoice, secondChoice, positionChange): SummaryResult {
  return {
    consensus: string,
    disagreement: <按 secondChoice 分支>,
    hiddenAssumption: <按 secondChoice 分支>,
    trajectory: { before, during, after },
    openQuestion: string,
    mode: "fallback"
  };
}
```

## 修改流程

1. 改 `src/lib/fallback/discuss.ts` 或 `summary.ts`
2. 跑 `node tests/core-branches.mjs` 验证 27 路径
3. 同步更新 `.harness/evals/branches.json` 的期望输出
4. 更新 `agents/director.md` 的"路由规则"小节（如果路由表变了）
