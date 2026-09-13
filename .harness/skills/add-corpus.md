# Skill · 加语料

## 何时加载

- 给项目加新的知乎问答语料
- 给现有话题加新观点（action / realist / conditional 各补几条）
- 改完语料后重新生成 embedding
- 评估是否要把当前 `zhihu-cli` 采集替换或扩展为 API / 搜索适配器

## 现状（2026-09-13）

- 当前 `src/data/topics.json` 有 **21 个话题**（T01-T21），总计 **1184 条席位记录**。
- 当前数据统计为 **752 个不同 contentId**；历史语料存在同一来源被多个席位引用的情况，不要为了清零重复而静默重写既有数据。
- **embedding 文件**：`src/data/topic-embeddings.json`（gitignore，按当前 source 数量生成，1536 维）。
- 以上数量是当前文件快照，不是永久常量；每次改语料都以校验命令的实际输出为准。

## 工作流

### Step 1: 准备源数据

确定要加什么：

- **新话题**：想加新的 `Txx` 吗？叫什么？3 个席位各找多少条知乎回答
- **现有话题补数据**：T01 的 action 席缺几条？补 5 条 action + 3 条 realist + 2 条 conditional
- **新观点类型**：现在的 schema 只有 action/realist/conditional，加新类型要同步改 `.harness/agents/` 和路由

### Step 2: 写进 `src/data/topics.json`

文件结构：

```json
{
  "T01": {
    "id": "T01",
    "title": "裸辞",
    "seats": {
      "action": [
        {
          "contentId": "-8709312983258158741",  // 来源系统的稳定 ID
          "title": "...",
          "author": "知乎答主名",
          "contentText": "完整回答（建议 200-2000 字）",
          "url": "https://www.zhihu.com/question/.../answer/...",
          "voteUpCount": 6,
          "commentCount": 1,
          "authorityLevel": "4"
        }
      ],
      "realist": [...],
      "conditional": [...]
    }
  }
}
```

**关键约束**：

- `contentId` 从来源系统的稳定 ID 取。新增记录不能与已有来源意外冲突；历史数据中的跨席位重复要记录但不静默重写
- `contentText` 必须是完整原文，不要截断（用于给 LLM 看的"参考来源"）
- `url` 必须带 `utm=openai_platform` 标识（防爬虫）
- `voteUpCount` / `commentCount` / `authorityLevel` 来自当前 provider 的明确字段映射
- 新加的话题 `id` 必须唯一（不能跟现有话题重复）

### Step 2.5: 选样本数量

加语料前先决定规模：

| 场景 | 建议样本量 | 理由 |
|---|---|---|
| **快速 demo 验证** | 3 派 × 3 条 = 9 条 | 验证 schema + embedding 流水线 + 检索是否跑通，约 3 分钟 |
| **生产用** | 3 派 × ~20 条 = 60 条 | 单话题完整覆盖，RAG 检索质量稳定 |
| **冷启动新赛季** | 3 派 × ~10 条 = 30 条 | MVP 验证，2 周内补到 60 条 |

**实测时间**（基于 text-embedding-3-small，1536 维）：

| 数量 | 时间 | 成本估算 |
|---|---|---|
| 9 条 | ~3 min | < $0.01 |
| 30 条 | ~6 min | < $0.01 |
| 60 条 | ~9 min | < $0.01 |
| 当前全量（以校验命令为准）| 取决于 provider / API 速度 | 按实际 token 用量 |

> 实战经验：3 派 × 3 条 = 9 条样本够 demo 跑通，**不要追求一次到位**。先 9 条验证 pipeline，再慢慢加。

### Step 3: 生成 embedding

```bash
# 增量修改已有 topics.json 时，默认只重建 embedding：
node scripts/embed-topics.mjs

# 只有明确要重新采集并覆盖 topics.json 时才运行：
npm run rag:build
# 等价于：
#   node scripts/collect-corpus-batch.mjs  (覆盖式 ZhihuCLI 采集)
#   node scripts/embed-topics.mjs          (调 embedding API 生成向量)
```

**前提**：

- `.env.local` 配了 `AI_API_KEY` 和 `AI_BASE_URL`
- embedding 模型默认 `text-embedding-3-small`（1536 维）
- 运行 `npm run rag:build` 前必须确认覆盖 `src/data/topics.json` 是有意行为，并先保存现有数据。
- `scripts/collect-corpus-batch.mjs` 当前把 `zhihu-cli.exe` 写成 Windows 绝对路径；在 macOS / Linux 上不能直接完成采集阶段。

**输出**：`src/data/topic-embeddings.json`（自动 gitignore）

### Step 4: 验证

```bash
# 27 路径核心回归（必须有 embedding 才能跑 AI 模式）
npm run test:core
# 期望：PASS: 3 first-round / 9 combined / 27 summaries

# 8 RAG 路径
npm run test:rag
# 期望：PASS: 8 RAG path checks
```

浏览器实测（dev 或 start）：

- 选 support_quit → 检查 reply 是不是真实知乎答主的话（不是兜底）
- 检查 sourceUrls 是不是带 utm=openai_platform 标识
- 检查新加的语料能被检索到（在 /api/discuss 响应里看 sourceIds）

### Step 5: Commit

按 [`commit-with-rationale`](./commit-with-rationale.md) skill：

- 写 change report 引用 `npm run rag:build` 输出（多少 batches，多少 tokens）
- commit message 形如 `feat(corpus): T21 加 60 条（action=20 + realist=20 + conditional=20）`

## 批量采集

如果要用当前 ZhihuCLI 批量拉新语料，用 `scripts/collect-corpus-batch.mjs`：

```bash
# 1. 确认 Windows ZhihuCLI 与运行权限可用
# 2. 跑采集脚本
node scripts/collect-corpus-batch.mjs

# 3. 当前脚本输出 src/data/topics.json（已有内容会被覆盖！）
# 4. 如果只想加新话题不覆盖，先备份并手动 merge
cp src/data/topics.json src/data/topics.json.bak
node scripts/collect-corpus-batch.mjs
# 手动 merge
```

> ⚠️ `collect-corpus-batch.mjs` 默认会**覆盖** `topics.json`，且当前脚本依赖 Windows 下的 ZhihuCLI。不要把一次失败采集产生的空结果或半成品覆盖到 canonical source。

## 未来 API / 搜索采集边界

如果后续接入官方 API、站内搜索 API 或其他合规搜索方式，先新增采集 adapter，不要把 provider 响应直接散落到业务代码。推荐保持下面的边界：

```text
provider search(query, count)
  → normalize(raw item)
  → classify(topic, seat)
  → merge / validate current topics.json schema
```

adapter 的规范化结果至少要能映射到现有字段：`contentId`、`title`、`author`、`contentText`、`url`、`voteUpCount`、`commentCount`、`authorityLevel`。provider 名称、查询词、分页、抓取时间和失败原因放采集日志或 change report，不擅自改变运行时 source schema。

接入新 provider 前必须先确认：

- 认证变量、权限范围、速率限制、分页、重试和超时；
- 正文是否完整、是否允许保存、来源 URL 是否可追溯；
- provider 失败时是否保留旧 `topics.json`，不能用空结果覆盖已有数据；
- 如何继续保留当前 ZhihuCLI 的兼容回退；
- 如何通过同一套 `contentId`、URL、字段完整性和 RAG 回归检查。

在这些约束落地前，继续使用当前 ZhihuCLI 流程；不要把未来 API 写成已经存在的能力。任何 token、Cookie、请求头或 API key 都只能来自运行时环境，不进入数据、日志或文档。

## 性能 / 成本预估

| 数量 | embedding 时间 | tokens | 估算费用（text-embedding-3-small $0.02/1M tokens） |
|---|---|---|---|
| 20 条 | ~30s | ~15K | $0.0003 |
| 60 条（1 话题） | ~90s | ~45K | $0.0009 |
| 1200 条（重建） | ~30 min | ~900K | $0.018 |

容量和成本以 `src/data/topics.json` 的实际条数、embedding provider 的 token 统计和报告记录为准。

## 常见问题

### Q: 加新语料后测试挂了

```bash
# 1. 检查 topics.json 格式
node -e "const t=require('./src/data/topics.json'); console.log(Object.keys(t).length, 'topics')"

# 2. 检查每个 topic 的 seats 都有
node -e "const t=require('./src/data/topics.json'); for(const k of Object.keys(t)) { const s=t[k].seats; console.log(k, s.action.length, s.realist.length, s.conditional.length) }"

# 3. 检查 contentId 重复，并区分历史重复与本次新增冲突
node -e "const t=require('./src/data/topics.json'); const ids=new Map(); let total=0; let dupes=0; for(const k of Object.keys(t)) for(const seat of ['action','realist','conditional']) for(const src of t[k].seats[seat]) { total++; if(ids.has(src.contentId)) dupes++; ids.set(src.contentId, k+'/'+seat); } console.log('records:', total, 'unique:', ids.size, 'duplicate placements:', dupes)"
```

### Q: embedding 跑一半挂了

通常是 API rate limit 或网络问题。重跑就行（已生成的 batches 不会丢，因为写到末尾才一次性 writeFile）。

### Q: 想加新"派"（如 moderator）

不只是加数据：

1. `.harness/agents/moderator.md` 加契约
2. `src/lib/agents/moderator/` 加运行时
3. `src/lib/prompts/seats/moderator.ts` 加 prompt
4. `src/lib/fallback/discuss.ts` / `summary.ts` 加兜底
5. `src/data/seats.json` 加 seat 配置
6. `src/data/sources.json` 加 9 条 source（如果新增 sourceIds）
7. 改 `src/data/topics.json` schema（加 moderator 数组）
8. 改 `src/lib/rag/topics.ts` 的 `Topic.seats` type
9. 跑 27 路径测试
10. 跑 embedding 重生成

加新"派"是 P1+ 工作，建议先开 issue 讨论。

## 自检清单

- [ ] `src/data/topics.json` 格式合法（每个 topic 有 id/title/seats，seats 有 3 派）
- [ ] 新增 `contentId` 未与已有来源意外冲突；历史重复已记录但未静默改写
- [ ] `url` 都带 `utm=openai_platform`
- [ ] `contentText` 是完整原文
- [ ] 增量数据默认跑 `node scripts/embed-topics.mjs`；覆盖式采集才跑 `npm run rag:build`
- [ ] 27 路径 + 8 RAG 路径全绿
- [ ] 浏览器实测能看到新语料
- [ ] Change report 引用了 build 输出（batches/tokens/时间）
- [ ] 开发前和开发后都扫过 `docs/requests/`；无后续需求时记录 `no follow-up request`

## 跟其他 skill / rule 的关系

- 提交技能：[`.harness/skills/commit-with-rationale.md`](./commit-with-rationale.md)
- 跨角色提需求：[`.harness/skills/request-from-teammate.md`](./request-from-teammate.md)
- 部署技能：[`.harness/skills/deploy-app.md`](./deploy-app.md)
- 语料脚本：
  - [`scripts/collect-corpus-batch.mjs`](../../scripts/collect-corpus-batch.mjs) — 校验 / 采集
  - [`scripts/embed-topics.mjs`](../../scripts/embed-topics.mjs) — 生成 embedding
- 报告模板：[`docs/change-reports/TEMPLATE.md`](../../docs/change-reports/TEMPLATE.md)
- 数据目录结构：[`docs/architecture/overview.md`](../../docs/architecture/overview.md)
