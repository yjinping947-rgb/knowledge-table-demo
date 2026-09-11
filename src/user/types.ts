// src/user/types.ts
// 用户域抽象类型。详见 .harness/agents/user.md。
//
// 本文件：
// - 定义 UserSession — 一次完整的两轮选择 + 反思
// - 定义 Trajectory — 立场轨迹（before / during / after）
//
// 关联类型（不在本文件，在 src/lib/types.ts，因为是跨模块共享）：
// - PositionChange — 立场变化程度（user 域引用）
// - FirstChoice / SecondChoice / SeatId / Mode — 跨模块基础类型

import type { FirstChoice, PositionChange, SeatId, SecondChoice } from "@/lib/types";

/**
 * 一次完整的用户会话：两轮选择 + 反思 + 已回应席位。
 *
 * 运行时表达见 `src/client/knowledge-table/state.ts` 的 `KnowledgeTableState`。
 *
 * 字段说明：
 * - `firstChoice`：第一轮表态（支持 / 反对 / 看情况）
 * - `secondChoice`：第二轮细化（立刻辞 / 等 offer / 设期限），第一轮后未到第二轮时为 null
 * - `positionChange`：反思环节用户自评的立场变化程度（未做反思时为 null）
 * - `respondedSeatIds`：已发出回应的席位列表（director 用来避免重复让同一席位发言）
 */
export type UserSession = {
  firstChoice: FirstChoice | null;
  secondChoice: SecondChoice | null;
  positionChange: PositionChange | null;
  respondedSeatIds: SeatId[];
};

/**
 * 立场轨迹：before（表态前）→ during（讨论中）→ after（反思后）。
 *
 * 三个字段都是 label 字符串（来自 `labels.first / second / change` 表），
 * 禁止让 LLM 自由发挥（见 `.harness/contracts/summary.md` 反约束）。
 */
export type Trajectory = {
  before: string;
  during: string;
  after: string;
};
