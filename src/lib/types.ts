// src/lib/types.ts
// 跨模块共享类型定义。P1 阶段先建，lib/types.ts 内容原样搬迁；P2 时清理 lib/ 旧文件。

export type SeatId = "action" | "realist" | "conditional";
export type FirstChoice = "support_quit" | "oppose_quit" | "depends";
export type SecondChoice = "leave_now" | "wait_offer" | "set_deadline";
export type PositionChange = "unchanged" | "slightly_changed" | "changed";
export type Mode = "ai" | "fallback";

export type DiscussResult = {
  selectedSeatId: SeatId;
  reply: string;
  hostComment: string;
  sourceIds: string[];
  mode: Mode;
};

export type SummaryResult = {
  consensus: string;
  disagreement: string;
  hiddenAssumption: string;
  trajectory: { before: string; during: string; after: string };
  openQuestion: string;
  mode: Mode;
};
