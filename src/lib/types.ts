// src/lib/types.ts
// 跨模块共享类型定义。P1 阶段先建，lib/types.ts 内容原样搬迁；P2 时清理 lib/ 旧文件。

export type SeatId = "action" | "realist" | "conditional";
export type FirstChoice = "support_quit" | "oppose_quit" | "depends";
export type SecondChoice = "leave_now" | "wait_offer" | "set_deadline";
export type PositionChange = "unchanged" | "slightly_changed" | "changed";
export type TendencyChoice = "closer_first" | "closer_second" | "both_valid" | "undecided" | "missed_point";
// `ai` 仅为旧 /api/discuss 契约保留；V2.5 会明确区分生成、检索和兜底。
export type Mode = "generated" | "retrieval" | "fallback" | "ai";

export type ApiMeta = {
  sessionId: string;
  requestId: string;
  topicId: string;
};

export type EvidenceFields = {
  sourceIds: string[];
  sourceSeatIds: SeatId[];
  sourceUrls?: string[];
  authors?: string[];
};

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
} & EvidenceFields;

export type CollisionPoint = {
  id: string;
  seatId: SeatId;
  text: string;
};

export type CollisionResult = ApiMeta & {
  challenge: DiscussionTurn;
  response: DiscussionTurn;
  hostComment: string;
  conversationQuoteIds: string[];
  mode: Mode;
};

export type DivergenceCandidate = {
  id: string;
  title: string;
  detail: string;
  conversationQuoteIds?: string[];
};

export type PerspectiveClaim = {
  claim: string;
  importance: "key" | "supporting";
  sourceIds: string[];
  supportStatus: "supported" | "partial" | "unsupported";
  supportExplanation: string;
};

export type PerspectiveResult = Partial<ApiMeta> & {
  name: string;
  origin?: "ai_synthesis" | "retrieval" | "fallback";
  basis: string;
  reframe: string;
  tool: string;
  judgmentTool?: string[];
  reply: string;
  sourceIds: string[];
  sourceSeatIds?: SeatId[];
  sourceUrls?: string[];
  authors?: string[];
  generatedFrom?: {
    divergenceId: string;
    conversationQuoteIds: string[];
  };
  generationEvidence?: {
    divergenceId: string;
    conversationQuoteIds: string[];
  };
  knowledgeEvidence?: { claims: PerspectiveClaim[] };
  claims?: PerspectiveClaim[];
  sourceStatus?: "sufficient" | "insufficient";
  sourceNotice?: string;
  mode: Mode;
};

export type FollowupResult = ApiMeta & {
  seatId: SeatId;
  reply: string;
  mode: Mode;
} & EvidenceFields;

export type SourceReference = {
  id: string;
  seatId: SeatId;
  title?: string;
  url?: string;
  author?: string;
  kind?: "knowledge" | "conversation" | "user";
};

export type DiscussionMap = {
  question: string;
  ripples: Array<{
    label: string;
    type: "conflict" | "premise" | "perspective";
    sourceSeat?: SeatId;
  }>;
  trajectory: {
    start: SeatId | "undecided";
    checkpoints: Array<"collision" | SeatId>;
    end: SeatId | "undecided";
  };
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
  sessionId?: string;
  requestId?: string;
  topicId?: string;
  discussionMap?: DiscussionMap;
  soulSentence?: string;
  sources?: SourceReference[];
  mode: Mode;
};

export type SessionStage =
  | "home"
  | "intro"
  | "first-seat"
  | "second-seat"
  | "tendency"
  | "collision-point"
  | "collision-drag"
  | "collision-response"
  | "divergence"
  | "perspective-preview"
  | "third-seat"
  | "exit-understanding"
  | "result";

export type SeatStatement = {
  seatId: SeatId;
  judgment: string;
  reasons?: string[];
  boundaries?: string[];
  collisionPoints?: CollisionPoint[];
  evidence?: EvidenceFields;
};

export type FollowupRecord = {
  seatId: Exclude<SeatId, "conditional">;
  question: string;
  result?: FollowupResult;
};

export type CollisionRecord = CollisionResult;

export type PerspectivePreview = PerspectiveResult;

export type SessionState = {
  sessionId: string;
  topicId: string;
  stage: SessionStage;
  firstSeatStatement?: SeatStatement;
  secondSeatStatement?: SeatStatement;
  followups: FollowupRecord[];
  tendency?: "closer_first" | "closer_second" | "undecided";
  selectedCollisionPoint?: CollisionPoint;
  collision?: CollisionRecord;
  divergences: DivergenceCandidate[];
  confirmedDivergence?: string;
  perspective?: PerspectivePreview;
  thirdSeatInvited: boolean;
  exitUnderstanding?: string;
  discussionMap?: DiscussionMap;
  soulSentence?: string;
  updatedAt: string;
};
