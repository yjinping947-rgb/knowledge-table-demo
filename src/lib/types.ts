// src/lib/types.ts
// 跨模块共享类型定义。P1 阶段先建，lib/types.ts 内容原样搬迁；P2 时清理 lib/ 旧文件。

export type SeatId = "action" | "realist" | "conditional";
export type FirstChoice = "support_quit" | "oppose_quit" | "depends";
export type SecondChoice = "leave_now" | "wait_offer" | "set_deadline";
export type PositionChange = "unchanged" | "slightly_changed" | "changed";
export type TendencyChoice = "closer_first" | "closer_second" | "both_valid" | "undecided" | "missed_point";
export type Mode = "ai" | "fallback";

export type DiscussResult = {
  selectedSeatId: SeatId;
  reply: string;
  hostComment: string;
  sourceIds: string[];
  // RAG 模式新增：每条 sourceId 对应的原文 URL + 作者
  sourceUrls?: string[];
  authors?: string[];
  mode: Mode;
};

export type DiscussionTurn = {
  seatId: SeatId;
  reply: string;
  sourceIds: string[];
  sourceUrls?: string[];
  authors?: string[];
};

export type CollisionPoint = {
  id: string;
  seatId: SeatId;
  text: string;
};

export type CollisionResult = {
  challenge: DiscussionTurn;
  response: DiscussionTurn;
  hostComment: string;
  mode: Mode;
};

export type DivergenceCandidate = {
  id: string;
  title: string;
  detail: string;
};

export type PerspectiveResult = {
  name: string;
  basis: string;
  reframe: string;
  tool: string;
  reply: string;
  sourceIds: string[];
  sourceUrls?: string[];
  authors?: string[];
  mode: Mode;
};

export type FollowupResult = {
  seatId: SeatId;
  reply: string;
  sourceIds: string[];
  sourceUrls?: string[];
  authors?: string[];
  mode: Mode;
};

export type ThoughtTrail = {
  tendency: string;
  collisionPoint: string;
  challenge: string;
  response: string;
  turningPoint: string;
  confirmedDivergence: string;
  perspective: string;
  departure: string;
};

export type SummaryResult = {
  consensus: string;
  disagreement: string;
  hiddenAssumption: string;
  trajectory: { before: string; during: string; after: string };
  openQuestion: string;
  // RAG 模式新增：4 字段对应 4 条真实来源
  sourceIds?: string[];
  sourceUrls?: string[];
  authors?: string[];
  thoughtTrail?: ThoughtTrail;
  perspective?: PerspectiveResult;
  mode: Mode;
};
