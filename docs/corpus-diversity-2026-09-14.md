# 三席语料区分度审计（2026-09-14）

本报告为只读审计，不修改 src/data/topics.json。跨席位重复来源保留为历史事实，不能仅凭重复数删除。

- 正式话题：20
- 关注阈值：任一席位对 Jaccard 重叠率 > 25%
- 被标记话题：19

## 席位对汇总

| 席位对 | 共享放置数 | 平均 Jaccard | 最大 Jaccard |
|---|---:|---:|---:|
| action/realist | 211 | 36.5% | 53.8% |
| action/conditional | 201 | 33.8% | 42.9% |
| realist/conditional | 200 | 33.5% | 37.9% |

## 话题明细

| 话题 | 标题 | 放置数 | 唯一来源 | 重复放置 | 席位对共享数 |
|---|---|---:|---:|---:|---|
| T01 | 裸辞 | 60 | 38 | 22 | action/realist: 10；action/conditional: 12；realist/conditional: 10 |
| T02 | 跳槽涨薪 | 60 | 39 | 21 | action/realist: 10；action/conditional: 10；realist/conditional: 11 |
| T03 | 35岁危机 | 60 | 36 | 24 | action/realist: 14；action/conditional: 10；realist/conditional: 10 |
| T04 | 工作倦怠 | 60 | 40 | 20 | action/realist: 8；action/conditional: 10；realist/conditional: 9 |
| T05 | 副业赚钱 | 60 | 38 | 22 | action/realist: 11；action/conditional: 10；realist/conditional: 11 |
| T06 | 大厂 vs 小公司 | 60 | 35 | 25 | action/realist: 13；action/conditional: 12；realist/conditional: 11 |
| T07 | 转行 | 60 | 40 | 20 | action/realist: 10；action/conditional: 10；realist/conditional: 10 |
| T08 | 学历贬值 | 60 | 37 | 23 | action/realist: 12；action/conditional: 11；realist/conditional: 10 |
| T09 | 体制内 | 60 | 49 | 11 | action/realist: 4；action/conditional: 5；realist/conditional: 6 |
| T10 | 职场晋升 | 60 | 40 | 20 | action/realist: 10；action/conditional: 10；realist/conditional: 10 |
| T11 | 工作与抑郁 | 60 | 38 | 22 | action/realist: 12；action/conditional: 10；realist/conditional: 10 |
| T12 | 婚姻相亲 | 60 | 40 | 20 | action/realist: 10；action/conditional: 10；realist/conditional: 10 |
| T13 | 买房房贷 | 60 | 40 | 20 | action/realist: 10；action/conditional: 10；realist/conditional: 10 |
| T14 | 消费降级 | 60 | 36 | 24 | action/realist: 14；action/conditional: 10；realist/conditional: 10 |
| T15 | 父母关系 | 60 | 40 | 20 | action/realist: 10；action/conditional: 10；realist/conditional: 10 |
| T16 | 同事边界 | 60 | 38 | 22 | action/realist: 11；action/conditional: 11；realist/conditional: 11 |
| T17 | AI时代能力 | 60 | 40 | 20 | action/realist: 10；action/conditional: 10；realist/conditional: 10 |
| T18 | 远程工作 | 60 | 40 | 20 | action/realist: 10；action/conditional: 10；realist/conditional: 10 |
| T19 | 自媒体IP | 60 | 39 | 21 | action/realist: 10；action/conditional: 10；realist/conditional: 11 |
| T20 | 行业选择 | 60 | 38 | 22 | action/realist: 12；action/conditional: 10；realist/conditional: 10 |

## 结论

重复来源是质量信号，不是自动删除条件；下一步需抽查高重叠话题的正文是否确实支持不同立场。