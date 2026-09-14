# 追问席位串位问题分析

## 1. 问题概述

在“知识拼桌” Demo 中，用户通过“举手追问”向指定席位提问时，出现了回答与席位或问题不匹配的情况。

典型流程如下：

1. 用户点击第一席（行动派）；
2. 提问“辞职后父母生病了怎么办”；
3. 返回一段偏向“裸辞后很快乐”的行动派语料；
4. 用户再次追问第一席：“如果孩子生病了呢”；
5. 返回“因为劝你的人，不用替你上班……”；
6. 该回答在当前 `topics.json` 中属于现实派语料，因此表现为明显的席位串位。

## 2. 正常流程

### 2.1 前端点击席位

席位卡片通过 `seat.id` 绑定追问入口：

```tsx
onClick={() => onAsk(seat.id)}
```

席位 ID 约定为：

| 视觉席位 | seatId |
|---|---|
| 行动派 | `action` |
| 现实派 | `realist` |
| 条件派 | `conditional` |

条件派当前不开放追问，前端会直接拦截。

### 2.2 前端保存当前追问席位

点击席位后，前端执行：

```ts
dispatch({ type: "SET_FOLLOWUP", seatId, result: null });
```

预期状态为：

```text
行动派 → followupSeatId = "action"
现实派 → followupSeatId = "realist"
```

同时将旧的追问结果清空。

### 2.3 前端发送请求

用户提交问题后，请求 `/api/followup`：

```json
{
  "topicId": "T01",
  "seatId": "action",
  "question": "如果孩子生病了呢"
}
```

如果用户追问现实派，则应为：

```json
{
  "topicId": "T01",
  "seatId": "realist",
  "question": "如果孩子生病了呢"
}
```

### 2.4 后端校验和检索

接口使用 Zod 校验：

```ts
seatId: z.enum(["action", "realist"])
```

随后调用：

```ts
retrieveSessionSources(input.topicId, input.seatId, query)
```

检索函数会根据 `seatId` 限定候选集合：

```ts
const seatsToSearch = filter.seat
  ? [filter.seat]
  : ["action", "realist", "conditional"];
```

因此，当 `seatId = "action"` 时，理论上只会检索：

```ts
topic.seats.action
```

不会主动检索：

```ts
topic.seats.realist
```

## 3. 已确认的事实

### 3.1 “因为劝你的人”属于现实派语料

当前数据中，这段回答对应：

```text
topicId: T01
seat: realist
contentId: -955874188618735554
title: 所有人都在劝别裸辞的环境下,为什么还有那么多人离职? - 知乎
author: 天痴
```

它不是当前 `T01.action` 数组中的内容。

### 3.2 当前检索理论上会隔离席位

当前 `retrieveFromTopics()` 接收 `filter.seat`，并只收集对应席位的候选语料。因此，如果以下条件同时成立：

1. 浏览器确实发送了 `seatId: "action"`；
2. 服务运行的是当前工作区代码；
3. 服务读取的是当前 `src/data/topics.json`；

那么接口不应该从 `realist` 数组中选出“因为劝你的人”这条内容。

这意味着录屏中的串位不能简单归因于“排序不准”，还需要确认实际请求和运行版本。

### 3.3 追问相关性确实不足

追问接口当前的处理方式是：

1. 检索一个来源；
2. 截取来源原文前 260 个字符；
3. 直接作为回答展示。

也就是说，这不是严格意义上的“根据问题重新回答”，而是“从席位语料中找一段原文摘录”。

因此，即使席位没有串位，下面这种结果仍然可能出现：

```text
用户问题：父母生病怎么办
返回内容：裸辞半年很快乐
```

这属于问题相关性不足，而不是席位归属错误。

## 4. 可能根因

### 4.1 实际发送的 `seatId` 不正确

最先需要排查的是：用户视觉上点击了行动派，但浏览器实际发送的可能是：

```json
"seatId": "realist"
```

可能原因包括：

- 视觉顺序与内部 `seat.id` 不一致；
- 点击事件绑定到了错误卡片；
- 页面热更新后状态与显示不同步；
- 录屏连接的是另一份服务或另一版本页面。

### 4.2 运行中的服务不是当前代码

需要排除以下情况：

- 旧的 `next dev` 进程仍在运行；
- 浏览器连接到了旧的生产构建；
- 服务是在其他目录启动的；
- 修改代码后没有重启服务；
- `.next` 构建产物与工作区源码不一致。

工作区代码正确，不代表浏览器当前请求使用的就是这份代码。

### 4.3 旧追问结果覆盖新追问结果

前端当前没有请求版本控制。

如果用户快速连续发起两个请求：

```text
请求 A：现实派问题
请求 B：行动派问题
```

可能出现：

1. B 先返回并显示；
2. A 后返回；
3. A 的旧结果覆盖 B。

当前代码只通过 `loading` 禁止部分重复操作，但没有用 request ID 判断返回结果是否仍然属于当前追问。

### 4.4 embedding 文件名或索引不匹配

代码尝试读取：

```text
src/data/topic-embeddings.json
```

当前数据目录中实际可见的是：

```text
src/data/rag-embeddings.json
```

因此 `loadTopicEmbeddings()` 很可能捕获文件不存在异常，并退化到 fallback 排序。

fallback 排序主要依赖：

- `authorityLevel`；
- 关键词命中；
- `voteUpCount`。

这会造成不同追问反复命中相同的高权重原文，解释了“父母生病”和“孩子生病”都没有得到针对性回应。

但需要强调：fallback 排序弱可以解释“答非所问”，不能单独解释跨席位返回，除非实际 `seatId` 或运行版本也存在问题。

## 5. 为什么两次回答都不符合预期

### 5.1 “父母生病”问题

用户的问题包含家庭责任和风险条件：

- 父母照护；
- 医疗支出；
- 家庭现金流；
- 裸辞后的保障；
- 是否需要调整行动时机。

但返回内容只强调：

- 裸辞后的自由；
- 情绪改善；
- 生活重新开始。

它可能仍然来自行动派，但没有处理用户新增的家庭情境，属于“席位大致正确、问题回答失败”。

### 5.2 “孩子生病”问题

返回的“因为劝你的人，不用替你上班……”内容：

- 属于现实派；
- 主要讨论工作压迫和身心消耗；
- 没有讨论孩子生病后的家庭责任；
- 没有说明行动派在该情境下会如何调整建议。

因此这次同时出现：

1. 席位不匹配；
2. 问题不匹配；
3. 回答像是复用了之前的结果或高权重原文。

## 6. 建议的排查方法

### 6.1 先记录实际请求

在 `/api/followup` 临时加入：

```ts
console.log("[followup:request]", {
  topicId: input.topicId,
  seatId: input.seatId,
  question: input.question,
});
```

重点确认：

```text
用户点击行动派时，seatId 是否真的是 action？
```

### 6.2 再记录检索结果

加入：

```ts
console.log("[followup:sources]", {
  seatId: input.seatId,
  sourceIds: sources.map((source) => source.contentId),
  authors: sources.map((source) => source.author),
  titles: sources.map((source) => source.title),
});
```

根据日志可以区分：

| 现象 | 结论 |
|---|---|
| 请求就是 `realist` | 前端点击或状态绑定错误 |
| 请求是 `action`，结果却是现实派来源 | 后端数据、索引或运行版本错误 |
| 后端结果正确，页面显示错误 | 前端状态或旧请求覆盖 |
| 请求和来源都正确，但回答不相关 | 检索相关性 / fallback 策略问题 |

### 6.3 用浏览器 Network 面板复现

复现时记录每个请求的：

- Request Payload；
- Response JSON；
- `seatId`；
- `sourceIds`；
- `authors`；
- 请求开始和结束时间。

不要只根据页面文字判断串席，因为页面显示的可能是旧状态。

## 7. 修复建议

### 7.1 给检索结果增加明确的席位字段

当前 `TopicSource` 只知道自己来自哪个数组，结果对象本身没有 `seat` 字段。

建议构造候选项时加入：

```ts
{
  ...src,
  seat: s,
}
```

这样返回结果可以明确验证：

```ts
source.seat === input.seatId
```

### 7.2 接口返回前做席位安全校验

接口不应只信任检索层，还应该在返回前再次确认：

```ts
const validSources = sources.filter(
  (source) => source.seat === input.seatId,
);
```

如果没有合法来源，应返回对应席位的 fallback，而不是返回其他席位内容。

### 7.3 增加追问请求 ID

前端保存当前请求 ID：

```ts
const requestId = crypto.randomUUID();
latestRequestId.current = requestId;
```

请求完成后只接受最新请求：

```ts
if (requestId !== latestRequestId.current) return;
```

这样可以防止旧请求覆盖新请求。

### 7.4 修正 embedding 文件路径

需要统一以下文件名：

```text
src/data/topic-embeddings.json
src/data/rag-embeddings.json
```

应明确：

- 哪个文件用于全局 RAG；
- 哪个文件用于话题 + 席位检索；
- 构建脚本生成的文件名与运行时代码读取的文件名必须一致。

### 7.5 为追问增加情境化 fallback

追问不能只返回一段已有原文。至少应针对高风险家庭情境提供专门兜底：

- 父母生病；
- 孩子生病；
- 配偶失业；
- 房贷或债务；
- 医疗支出；
- 身心健康恶化。

行动派 fallback 应体现：

- 先保护家庭和健康；
- 行动不等于立即裸辞；
- 需要确认照护责任和最低现金流；
- 如果继续工作会影响照护或健康，应重新评估行动时机。

现实派 fallback 应体现：

- 先计算现金流和保障；
- 明确医疗或照护支出；
- 判断是否有其他家庭支持；
- 必要时设置期限，而不是无限期硬撑。

## 8. 应增加的回归测试

至少增加以下测试：

### 测试一：行动派席位约束

```json
POST /api/followup
{
  "topicId": "T01",
  "seatId": "action",
  "question": "如果孩子生病了呢"
}
```

断言：

```text
response.seatId === "action"
所有 source 的 seat === "action"
response.reply 不等于现实派“因为劝你的人……”语料
```

### 测试二：现实派席位约束

```json
POST /api/followup
{
  "topicId": "T01",
  "seatId": "realist",
  "question": "如果孩子生病了呢"
}
```

断言：

```text
response.seatId === "realist"
所有 source 的 seat === "realist"
```

### 测试三：不同问题不能固定返回同一条内容

分别请求：

```text
父母生病了怎么办
孩子生病了怎么办
身心健康已经不行了怎么办
```

至少应该保证回答不会在所有问题下无条件复用同一条原文。

### 测试四：旧请求不能覆盖新请求

模拟两个并发请求：

```text
请求 A：现实派
请求 B：行动派
```

最终页面结果必须对应最后一次请求 B。

## 9. 最终结论

当前问题不是单一的“AI 回答质量不好”，而是多个层次叠加：

1. 追问当前主要是原文摘录，不是真正的情境化回答；
2. embedding 文件名可能不一致，导致检索经常退化到 fallback；
3. fallback 对中文追问的语义区分能力不足；
4. 接口没有对返回来源做二次席位校验；
5. 前端没有防止旧请求覆盖新请求；
6. 录屏中出现的现实派原文，需要通过实际请求日志确认是前端传错 `seatId`、旧服务、数据索引，还是前端显示旧结果。

最优先的排查顺序是：

```text
确认 Request Payload 的 seatId
        ↓
确认后端返回的 sourceIds / authors
        ↓
确认运行中的服务是否为当前代码
        ↓
确认前端是否显示了旧请求结果
        ↓
补席位校验、请求 ID 和回归测试
```
