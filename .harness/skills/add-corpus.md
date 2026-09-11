# Skill · 加语料

## 何时加载

- 给项目加新的知乎问答语料
- 给现有话题加新观点（action / realist / conditional 各补几条）
- 改完语料后重新生成 embedding

## 现状（2026-09-12）

- **20 个话题**（T01-T20），每个话题下 3 个席位（action/realist/conditional）
- **每席约 20 条**回答，总计 **1175 条**（unique contentId 743 个）
- **embedding 文件**：`src/data/topic-embeddings.json`（gitignore，1175 × 1536 维，约 12MB）

## 工作流

### Step 1: 准备源数据

确定要加什么：

- **新话题**：想加 T21 吗？叫什么？3 个席位各找 20 条知乎回答
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
          "contentId": "-8709312983258158741",  // 唯一 ID，从知乎 API 拿
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

- `contentId` 必须唯一（整个 topics.json 不能重复）。从知乎 API 的 `id` 字段取
- `contentText` 必须是完整原文，不要截断（用于给 LLM 看的"参考来源"）
- `url` 必须带 `utm=openai_platform` 标识（防爬虫）
- `voteUpCount` / `commentCount` / `authorityLevel` 来自 API
- 新加的话题 `id` 必须唯一（不能跟现有 T01-T20 重复）

### Step 3: 跑 `npm run rag:build` 生成 embedding

```bash
npm run rag:build
# 等价于：
#   node scripts/collect-corpus-batch.mjs  (校验数据完整性)
#   node scripts/embed-topics.mjs          (调 embedding API 生成 1175+ 条向量)
```

**前提**：

- `.env.local` 配了 `AI_API_KEY` 和 `AI_BASE_URL`
- embedding 模型默认 `text-embedding-3-small`（1536 维）
- 1175 条大约 5 分钟，看 embedding provider 速度

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

如果要从知乎 API 拉新语料，用 `scripts/collect-corpus-batch.mjs`：

```bash
# 1. 配 access token（如果用了官方 API）
# 2. 跑采集脚本
node scripts/collect-corpus-batch.mjs

# 3. 脚本输出 src/data/topics.json（已有内容会被覆盖！）
# 4. 如果只想加新话题不覆盖，先备份
cp src/data/topics.json src/data/topics.json.bak
node scripts/collect-corpus-batch.mjs
# 手动 merge
```

> ⚠️ `collect-corpus-batch.mjs` 默认会**覆盖** `topics.json`。如果想增量加，先备份再 merge。

## 性能 / 成本预估

| 数量 | embedding 时间 | tokens | 估算费用（text-embedding-3-small $0.02/1M tokens） |
|---|---|---|---|
| 20 条 | ~30s | ~15K | $0.0003 |
| 60 条（1 话题） | ~90s | ~45K | $0.0009 |
| 1200 条（重建） | ~30 min | ~900K | $0.018 |

20 话题 × 3 派 × 20 = 1200 条总容量。当前 1175 条。

## 常见问题

### Q: 加新语料后测试挂了

```bash
# 1. 检查 topics.json 格式
node -e "const t=require('./src/data/topics.json'); console.log(Object.keys(t).length, 'topics')"

# 2. 检查每个 topic 的 seats 都有
node -e "const t=require('./src/data/topics.json'); for(const k of Object.keys(t)) { const s=t[k].seats; console.log(k, s.action.length, s.realist.length, s.conditional.length) }"

# 3. 检查 contentId 不重复
node -e "const t=require('./src/data/topics.json'); const ids=new Set(); const dupes=[]; for(const k of Object.keys(t)) for(const seat of ['action','realist','conditional']) for(const src of t[k].seats[seat]) { if(ids.has(src.contentId)) dupes.push(src.contentId); ids.add(src.contentId); } console.log('total:', ids.size, 'dupes:', dupes.length)"
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
- [ ] `contentId` 全局唯一
- [ ] `url` 都带 `utm=openai_platform`
- [ ] `contentText` 是完整原文
- [ ] 跑 `npm run rag:build` 成功
- [ ] 27 路径 + 8 RAG 路径全绿
- [ ] 浏览器实测能看到新语料
- [ ] Change report 引用了 build 输出（batches/tokens/时间）

## 跟其他 skill / rule 的关系

- 提交技能：[`.harness/skills/commit-with-rationale.md`](./commit-with-rationale.md)
- 跨角色提需求：[`.harness/skills/request-from-teammate.md`](./request-from-teammate.md)
- 部署技能：[`.harness/skills/deploy-app.md`](./deploy-app.md)
- 语料脚本：
  - [`scripts/collect-corpus-batch.mjs`](../../scripts/collect-corpus-batch.mjs) — 校验 / 采集
  - [`scripts/embed-topics.mjs`](../../scripts/embed-topics.mjs) — 生成 embedding
- 报告模板：[`docs/change-reports/TEMPLATE.md`](../../docs/change-reports/TEMPLATE.md)
- 数据目录结构：[`docs/architecture/overview.md`](../../docs/architecture/overview.md)
