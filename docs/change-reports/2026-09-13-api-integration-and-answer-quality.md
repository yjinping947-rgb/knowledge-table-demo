# API 接入情况与追问答非所问问题分析

## 1. 结论

项目确实接入了 OpenAI 兼容 API，但“举手追问”并不是由聊天模型生成回答。

当前追问实际流程是：

    用户问题
      ↓
    Embedding 向量化（配置 API 时）
      ↓
    在本地语料中检索
      ↓
    取第一条原文
      ↓
    截取前 260 个字符直接展示

它没有执行“聊天模型理解问题后重新组织答案”，所以出现“牛头不对马嘴”是当前实现方式导致的，不只是模型质量问题。

## 2. API 配置

配置变量位于 .env.example：

    AI_API_KEY=你的密钥
    AI_BASE_URL=兼容 OpenAI 的接口地址
    AI_MODEL=qwen3-vl-flash

项目在 src/lib/ai/client.ts 中通过以下条件判断 API 是否可用：

    Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL)

只有同时存在 AI_API_KEY 和 AI_BASE_URL 时，项目才认为 API 已配置。缺少任意一个变量时，进入 fallback 模式。

当前工作区能看到 .env.example，但没有发现 .env.local，因此无法仅凭工作区文件确认当前运行环境是否配置了真实密钥。

## 3. 不同接口的真实行为

| 功能 | 是否可能调用 API | 实际用途 | 是否由聊天模型生成 |
|---|---:|---|---:|
| /api/answer 房间问答 | 是 | embedding + /chat/completions | 是 |
| /api/followup 举手追问 | 是 | 主要是 embedding 检索 | 否 |
| /api/discuss 两轮讨论 | 是 | embedding + 原文摘录 | 否 |
| /api/summary 讨论总结 | 是 | embedding + 原文拼接 | 否 |
| /api/collision 碰撞回应 | 部分 | 检索 + 模板 | 否 |
| /api/divergence 隐藏分歧 | 否 | 固定模板 | 否 |
| /api/perspective 第三视角 | 主要否 | 固定逻辑 / fallback | 否 |

## 4. 举手追问为什么不准确

接口文件是 app/api/followup/route.ts。

核心逻辑是：

    const sources = await retrieveSessionSources(
      input.topicId,
      input.seatId,
      query,
    );

    reply: sourceExcerpt(sources[0], fallback, 260)

sourceExcerpt() 只是：

    source.contentText.slice(0, 260)

因此，用户问“如果孩子生病了呢”，程序不会生成关于孩子、照护、医疗支出的新回答，而是从裸辞相关语料中找一段原文直接显示。

如果检索到“裸辞后很快乐”或“因为劝你的人不用替你上班”，程序都会直接返回，即使这些内容没有回答用户的新条件。

## 5. Embedding 和聊天模型的区别

Embedding API 只负责把文本转换成向量，并用于相似度排序：

    文本 → 数字向量 → 找相似语料

Embedding 不负责：

- 理解用户真正担心什么；
- 结合家庭责任重新判断；
- 模拟行动派或现实派；
- 组织一段完整的新回答；
- 对多条来源进行归纳。

真正生成回答需要调用 POST /chat/completions。当前 /api/answer 房间问答实现了这一步，但 /api/followup 没有。

## 6. 当前真实链路

### 6.1 追问链路

    用户输入问题
      ↓
    /api/followup
      ↓
    拼接主题标题和问题
      ↓
    embedQuery（可能调用 embedding API）
      ↓
    retrieveFromTopics
      ↓
    取 sources[0]
      ↓
    截取原文
      ↓
    展示

### 6.2 期望链路

    用户输入问题
      ↓
    确定 topicId 和 seatId
      ↓
    检索当前席位的相关来源
      ↓
    构造席位 system prompt
      ↓
    调用 chat/completions
      ↓
    针对用户问题生成新回答
      ↓
    校验席位和来源
      ↓
    展示回答及参考来源

当前项目缺少从“检索”到“生成”的后半段。

## 7. mode: ai 的含义不准确

追问接口返回 mode: sessionMode()，而 sessionMode() 只检查是否配置了 API。

因此只要存在 AI_API_KEY 和 AI_BASE_URL，接口就可能返回 mode: ai。但这只表示可能调用了 embedding API，不表示当前 reply 是聊天模型生成的。

建议将模式拆为：

    generated   聊天模型生成
    retrieval   embedding 检索 + 原文摘录
    fallback    无 API 或调用失败

## 8. 建议的改造方式

### 8.1 追问接口增加聊天模型调用

保留当前检索步骤，但在检索后增加 /chat/completions：

    主题：${topic.title}
    当前席位：${input.seatId}
    用户追问：${input.question}

    参考来源：
    ${sources}

    请站在当前席位立场，直接回答用户问题。
    不要复述与问题无关的原文。
    如果来源没有覆盖该情境，请明确说明。

模型返回内容应作为 reply，而不是继续使用 sourceExcerpt(sources[0], fallback, 260)。

### 8.2 参考来源与最终回答分离

正确返回结构应该是：

    {
      reply: "模型针对用户问题生成的回答",
      sourceIds: ["参考来源 ID"],
      sourceUrls: ["参考来源 URL"],
      authors: ["参考作者"],
      mode: "generated"
    }

来源用于支撑回答，不应直接替代回答。

### 8.3 增加席位 Prompt

行动派应关注：

- 身心健康和不可逆损失；
- 必要时离开当前工作；
- 家庭照护和最低生活线；
- 行动不等于无计划冲动辞职。

现实派应关注：

- 现金流、医疗支出、家庭责任；
- 替代方案和风险边界；
- 家庭支持能力；
- 明确期限，而不是无限期硬撑。

条件派应关注：

- 触发条件、期限和安全线；
- 可检查的行动条件；
- 避免简单支持或反对。

### 8.4 修正 embedding 文件路径

运行时代码尝试读取 src/data/topic-embeddings.json，而当前数据目录中可见的是 src/data/rag-embeddings.json。

需要统一构建脚本和运行时代码的文件名，否则 topic 检索可能一直退化到 fallback 排序。

## 9. 验证方法

可以直接请求追问接口：

    curl -s http://localhost:3000/api/followup \
      -X POST \
      -H 'Content-Type: application/json' \
      -d '{"topicId":"T01","seatId":"action","question":"如果孩子生病了呢"}'

重点查看：

- mode
- seatId
- sourceIds
- authors
- reply

如果 reply 与 topics.json 中某条 contentText 开头完全一致，说明它是原文摘录，不是模型生成。

同时查看服务日志，确认是否真正出现：

    POST /chat/completions

如果只有 embedding 请求，没有 /chat/completions，则当前追问没有使用聊天模型。

## 10. 最终结论

项目具备 API 接入能力，但当前功能的接入层次不同：

- 房间问答：embedding 检索 + 聊天模型生成；
- 举手追问：主要是 embedding 检索 + 原文摘录；
- 两轮讨论：主要是 embedding 检索 + 原文摘录；
- 讨论总结：主要是 embedding 检索 + 原文拼接。

所以“回答牛头不对马嘴”的直接原因是：

> /api/followup 没有调用聊天模型，它只是从当前席位的本地语料中选一段原文直接展示。

要获得真正符合“如果孩子生病了呢”这类问题的回答，需要把追问改造成完整的 RAG 生成流程：

    席位限定检索
      + 用户问题
      + 席位 Prompt
      + chat/completions
      + 来源校验
      = 针对当前问题的新回答
