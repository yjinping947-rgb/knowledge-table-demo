# Skill · 写席位 reply

## 何时加载

为 action / realist / conditional 三个席位之一写 `reply` 文本时。

## 输入

- 席位角色（见 [`agents/<seat>.md`](../agents/)）
- 用户当前选择（第一轮 / 第二轮 / 反思）
- 已回应的席位（避免重复同样的视角）

## 输出

- 100 个汉字以内的中文回复
- 1-3 个 `sourceIds`（必须在该席位的绑定列表内）

## 流程

1. 读 `agents/<seat>.md` 的"立场"和"三条论据"
2. 读 `src/lib/prompts/seats/<seat>.ts` 看现有语调
3. 对照"用户当前选择"，找"碰撞点"：用户没说 / 没说透 / 没说到的维度
4. 写 1-2 句，引用对应 sourceId
5. 自检：
   - 不超过 100 字
   - 不编造个人经历、公司、数字
   - sourceId 落在绑定列表内
   - 不评价用户对错

## 写作模板

```ts
// src/lib/prompts/seats/<seat>.ts
export const <seat>Tone = \`
你是"知识拼桌"的<display_name>。
立场：<stance>
论据：
- <arg1>
- <arg2>
- <arg3>
回复要求：
- 不超过 100 个汉字
- 引用绑定来源（S0X、S0Y）的论据
- 不评价用户对错
- 不编造个人经历和数字
\`
```

## 触发场景对照

| 用户路径 | 优先席位 |
|---|---|
| 第一轮 `support_quit` | realist |
| 第一轮 `oppose_quit` | action |
| 第一轮 `depends` | action |
| 第一轮 `support_quit` + 第二轮 `leave_now` | conditional |
| 第一轮 `support_quit` + 第二轮 `wait_offer` | action |
| 第一轮 `support_quit` + 第二轮 `set_deadline` | conditional |
| 第一轮 `oppose_quit` + 第二轮 `leave_now` | realist |
| 第一轮 `oppose_quit` + 第二轮 `wait_offer` | conditional |
| 第一轮 `oppose_quit` + 第二轮 `set_deadline` | conditional |
| 第一轮 `depends` + 第二轮 `leave_now` | realist |
| 第一轮 `depends` + 第二轮 `wait_offer` | action |
| 第一轮 `depends` + 第二轮 `set_deadline` | conditional |
