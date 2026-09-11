// src/user/index.ts
// 用户模块统一入口。详见 .harness/agents/user.md。
//
// `PositionChange` 定义在 `@/lib/types`，不放在本模块 re-export。
// 这里只导出本模块自有类型（UserSession / Trajectory）。

export type { Trajectory, UserSession } from "./types";
