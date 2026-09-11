# Skill · 生成讨论地图

## 何时加载

`/api/summary` 或兜底生成 `SummaryResult` 时。

## 输出结构

```ts
{
  consensus: string;        // 共识
  disagreement: string;     // 真正分歧
  hiddenAssumption: string; // 隐藏前提
  trajectory: { before: string; during: string; after: string };
  openQuestion: string;     // 还没解决
  mode: 'ai' | 'fallback';
}
```

## 写作要求

| 字段 | 要求 | 字数上限 |
|---|---|---|
| `consensus` | 双方都同意的部分 | 60 |
| `disagreement` | 唯一最关键的分歧点 | 60 |
| `hiddenAssumption` | 用户可能默认但未表达的前提 | 60 |
| `trajectory.before` | 来自 `labels.first[firstChoice]` | 30 |
| `trajectory.during` | 来自 `labels.second[secondChoice]` | 30 |
| `trajectory.after` | 来自 `labels.change[positionChange]` | 30 |
| `openQuestion` | 仍未解决的问题 | 60 |

## 写作禁忌

- 不评价对错
- 不把推断写成事实
- 不给唯一答案
- 不堆叠术语
- 不出现"应该""建议""必须"

## 兜底生成公式

```ts
// src/lib/fallback/summary.ts
consensus: "长期有害的工作状态不应被无限忍耐，离开或留下都需要面对真实成本。"
disagreement: <按 secondChoice 三选一>
hiddenAssumption: <按 secondChoice 三选一>
trajectory: { before, during, after } // 三个 label 拼装
openQuestion: "现在的痛苦主要来自这份具体工作，还是来自尚未解决的职业方向？"
```

## 自检清单

- [ ] 27 路径全部能产出 summary（3 × 3 × 3 = 27）
- [ ] `mode: "fallback"` 标识正确
- [ ] 每个字段都非空
- [ ] 字数上限未超
- [ ] 跑 `node tests/core-branches.mjs` 全绿
