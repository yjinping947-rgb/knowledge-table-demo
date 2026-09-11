---
name: user
role: subject
display_name: 用户域
owned_files:
  - src/user/
---

# 用户域 · User

## 职责

- 描述用户状态（session）的数据结构
- 描述立场轨迹（trajectory）从 before → during → after
- 不持有任何 PII，仅描述交互中的"立场"

## 类型

详见 `src/user/types.ts`：

- `UserSession` — 一次完整的两轮选择 + 反思
- `Trajectory` — 立场轨迹
- `PositionChange` — 立场变化程度

## 约束

- 不在客户端持久化（项目不包含数据库，刷新即重置）
- 不存真实身份信息
- AI 提示词不引用用户任何"个人信息"

## 与其他 agent 的边界

- `user` 不参与讨论，只描述用户在讨论中的位置
- director 决定路由时不读 user 的"过去选择"作为依据（避免循环）
- 客户端的 state machine 是 user 域的运行时表达
