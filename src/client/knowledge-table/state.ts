// KnowledgeTable V2.5 状态机：主进度与追问子流程分开记录。

import type {
  CollisionPoint,
  CollisionResult,
  DivergenceCandidate,
  FirstChoice,
  FollowupResult,
  PerspectiveResult,
  PositionChange,
  SecondChoice,
  SummaryResult,
  TendencyChoice,
  SeatId,
} from "@/lib/types";
import type { UserSession } from "../../user";

export type Stage =
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

export type RequestKind = "followup" | "collision" | "divergence" | "perspective" | "summary";

/** Legacy alias kept for host strip consumers outside the V2.5 flow. */
export type ResponseWithRound = {
  selectedSeatId: SeatId;
  reply: string;
  hostComment: string;
  sourceIds: string[];
  mode: "generated" | "retrieval" | "fallback" | "ai";
  round?: number;
};

export type FollowupRecord = {
  seatId: Exclude<SeatId, "conditional">;
  question: string;
  result: FollowupResult;
};

export type KnowledgeTableState = {
  sessionId: string;
  stage: Stage;
  firstSeatStatement: string | null;
  secondSeatStatement: string | null;
  firstChoice: FirstChoice | null;
  secondChoice: SecondChoice | null;
  positionChange: PositionChange | null;
  tendency: TendencyChoice | null;
  collisionPoint: CollisionPoint | null;
  collisionStarted: boolean;
  collision: CollisionResult | null;
  divergences: DivergenceCandidate[];
  confirmedDivergence: string | null;
  perspective: PerspectiveResult | null;
  thirdSeatInvited: boolean;
  exitUnderstanding: string;
  followupAnchor: "first-seat" | "second-seat" | null;
  followupSeatId: Exclude<SeatId, "conditional"> | null;
  followup: FollowupResult | null;
  followups: FollowupRecord[];
  summary: SummaryResult | null;
  pendingRequests: Partial<Record<RequestKind, string>>;
  updatedAt: string;
};

export function createInitialState(): KnowledgeTableState {
  return {
    sessionId: "",
    stage: "home",
    firstSeatStatement: null,
    secondSeatStatement: null,
    firstChoice: null,
    secondChoice: null,
    positionChange: null,
    tendency: null,
    collisionPoint: null,
    collisionStarted: false,
    collision: null,
    divergences: [],
    confirmedDivergence: null,
    perspective: null,
    thirdSeatInvited: false,
    exitUnderstanding: "",
    followupAnchor: null,
    followupSeatId: null,
    followup: null,
    followups: [],
    summary: null,
    pendingRequests: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export const initialState = createInitialState();

export type KnowledgeTableAction =
  | { type: "START_SESSION"; sessionId: string }
  | { type: "SET_STAGE"; stage: Stage }
  | { type: "SET_SEAT_STATEMENT"; seatId: "action" | "realist"; statement: string }
  | { type: "SET_FIRST_CHOICE"; choice: FirstChoice | null }
  | { type: "SET_SECOND_CHOICE"; choice: SecondChoice | null }
  | { type: "SET_POSITION_CHANGE"; choice: PositionChange | null }
  | { type: "SET_TENDENCY"; choice: TendencyChoice | null }
  | { type: "SET_COLLISION_POINT"; point: CollisionPoint | null }
  | { type: "SET_COLLISION_STARTED"; started: boolean }
  | { type: "SET_COLLISION"; collision: CollisionResult | null }
  | { type: "SET_DIVERGENCES"; divergences: DivergenceCandidate[] }
  | { type: "SET_CONFIRMED_DIVERGENCE"; value: string | null }
  | { type: "SET_PERSPECTIVE"; perspective: PerspectiveResult | null }
  | { type: "SET_THIRD_SEAT"; invited: boolean }
  | { type: "SET_EXIT_UNDERSTANDING"; value: string }
  | { type: "OPEN_FOLLOWUP"; seatId: "action" | "realist"; anchor: "first-seat" | "second-seat" }
  | { type: "SET_FOLLOWUP_RESULT"; result: FollowupResult; question: string }
  | { type: "CLOSE_FOLLOWUP" }
  | { type: "SET_SUMMARY"; summary: SummaryResult | null }
  | { type: "BEGIN_REQUEST"; kind: RequestKind; requestId: string }
  | { type: "END_REQUEST"; kind: RequestKind; requestId: string }
  | { type: "RESET" };

const touched = <T extends object>(state: T) => ({ ...state, updatedAt: new Date().toISOString() });

export function reducer(state: KnowledgeTableState, action: KnowledgeTableAction): KnowledgeTableState {
  switch (action.type) {
    case "START_SESSION":
      return touched({ ...createInitialState(), sessionId: action.sessionId, stage: "intro" });
    case "SET_STAGE":
      return touched({ ...state, stage: action.stage });
    case "SET_SEAT_STATEMENT":
      return touched(
        action.seatId === "action"
          ? { ...state, firstSeatStatement: action.statement }
          : { ...state, secondSeatStatement: action.statement },
      );
    case "SET_FIRST_CHOICE":
      return touched({ ...state, firstChoice: action.choice });
    case "SET_SECOND_CHOICE":
      return touched({ ...state, secondChoice: action.choice });
    case "SET_POSITION_CHANGE":
      return touched({ ...state, positionChange: action.choice });
    case "SET_TENDENCY":
      return touched({ ...state, tendency: action.choice });
    case "SET_COLLISION_POINT":
      return touched({ ...state, collisionPoint: action.point, collisionStarted: false, collision: null });
    case "SET_COLLISION_STARTED":
      return touched({ ...state, collisionStarted: action.started });
    case "SET_COLLISION":
      return touched({ ...state, collision: action.collision });
    case "SET_DIVERGENCES":
      return touched({ ...state, divergences: action.divergences });
    case "SET_CONFIRMED_DIVERGENCE":
      return touched({ ...state, confirmedDivergence: action.value });
    case "SET_PERSPECTIVE":
      return touched({ ...state, perspective: action.perspective });
    case "SET_THIRD_SEAT":
      return touched({ ...state, thirdSeatInvited: action.invited });
    case "SET_EXIT_UNDERSTANDING":
      return touched({ ...state, exitUnderstanding: action.value });
    case "OPEN_FOLLOWUP":
      return touched({ ...state, followupAnchor: action.anchor, followupSeatId: action.seatId, followup: null });
    case "SET_FOLLOWUP_RESULT":
      if (!state.followupSeatId) return state;
      return touched({
        ...state,
        followup: action.result,
        followups: [...state.followups, { seatId: state.followupSeatId, question: action.question, result: action.result }],
      });
    case "CLOSE_FOLLOWUP":
      return touched({ ...state, followupAnchor: null, followupSeatId: null, followup: null });
    case "SET_SUMMARY":
      return touched({ ...state, summary: action.summary });
    case "BEGIN_REQUEST":
      return touched({ ...state, pendingRequests: { ...state.pendingRequests, [action.kind]: action.requestId } });
    case "END_REQUEST": {
      if (state.pendingRequests[action.kind] !== action.requestId) return state;
      const pendingRequests = { ...state.pendingRequests };
      delete pendingRequests[action.kind];
      return touched({ ...state, pendingRequests });
    }
    case "RESET":
      return createInitialState();
    default:
      return state;
  }
}

export const selectLoading = (state: KnowledgeTableState) => Object.keys(state.pendingRequests).length > 0;
export const selectDemoMode = (state: KnowledgeTableState) => {
  const modes = [
    ...state.followups.map((item) => item.result.mode),
    state.collision?.mode,
    state.perspective?.mode,
    state.summary?.mode,
  ];
  return modes.some((mode) => mode === "fallback" || mode === "retrieval");
};

/** 将 V2.5 状态投影到仍在使用的 user 域，避免破坏外围功能。 */
export const selectUserSession = (state: KnowledgeTableState): UserSession => ({
  firstChoice: state.firstChoice,
  secondChoice: state.secondChoice,
  positionChange: state.positionChange,
  respondedSeatIds: state.collision ? [state.collision.response.seatId] : [],
});
