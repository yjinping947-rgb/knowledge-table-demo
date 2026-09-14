// src/client/knowledge-table/state.ts
// KnowledgeTable 的状态机。详见 .harness/AGENTS.md 与 .harness/rules/ui-invariance.md。

import type {
  CollisionPoint,
  CollisionResult,
  DiscussResult,
  DivergenceCandidate,
  FirstChoice,
  FollowupResult,
  FollowupTurn,
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
  | "tendency"
  | "collision-point"
  | "collision-response"
  | "divergence"
  | "perspective-preview"
  | "third-seat"
  | "result";

export type ResponseWithRound = DiscussResult & { round: number };

export type KnowledgeTableState = {
  stage: Stage;
  firstChoice: FirstChoice | null;
  secondChoice: SecondChoice | null;
  positionChange: PositionChange | null;
  tendency: TendencyChoice | null;
  collisionPoint: CollisionPoint | null;
  collision: CollisionResult | null;
  collisionRevealedSeats: SeatId[];
  divergences: DivergenceCandidate[];
  confirmedDivergence: string | null;
  perspective: PerspectiveResult | null;
  thirdSeatInvited: boolean;
  followupSeatId: SeatId | null;
  followup: FollowupResult | null;
  followupHistory: Partial<Record<SeatId, FollowupTurn[]>>;
  likedQuotes: string[];
  revealedSeats: SeatId[];
  responses: ResponseWithRound[];
  summary: SummaryResult | null;
  loading: boolean;
};

export const initialState: KnowledgeTableState = {
  stage: "home",
  firstChoice: null,
  secondChoice: null,
  positionChange: null,
  tendency: null,
  collisionPoint: null,
  collision: null,
  collisionRevealedSeats: [],
  divergences: [],
  confirmedDivergence: null,
  perspective: null,
  thirdSeatInvited: false,
  followupSeatId: null,
  followup: null,
  followupHistory: {},
  likedQuotes: [],
  revealedSeats: [],
  responses: [],
  summary: null,
  loading: false,
};

export type KnowledgeTableAction =
  | { type: "SET_STAGE"; stage: Stage }
  | { type: "SET_FIRST_CHOICE"; choice: FirstChoice | null }
  | { type: "SET_SECOND_CHOICE"; choice: SecondChoice | null }
  | { type: "SET_POSITION_CHANGE"; choice: PositionChange | null }
  | { type: "SET_TENDENCY"; choice: TendencyChoice | null }
  | { type: "SET_COLLISION_POINT"; point: CollisionPoint | null }
  | { type: "SET_COLLISION"; collision: CollisionResult | null }
  | { type: "REVEAL_COLLISION_SEAT"; seatId: SeatId }
  | { type: "SET_DIVERGENCES"; divergences: DivergenceCandidate[] }
  | { type: "SET_CONFIRMED_DIVERGENCE"; value: string | null }
  | { type: "SET_PERSPECTIVE"; perspective: PerspectiveResult | null }
  | { type: "SET_THIRD_SEAT"; invited: boolean }
  | { type: "SET_FOLLOWUP"; seatId: SeatId | null; result?: FollowupResult | null }
  | { type: "ADD_FOLLOWUP"; seatId: SeatId; question: string; result: FollowupResult }
  | { type: "TOGGLE_LIKE"; quote: string }
  | { type: "REVEAL_SEAT"; seatId: SeatId }
  | { type: "ADD_RESPONSE"; response: ResponseWithRound }
  | { type: "SET_SUMMARY"; summary: SummaryResult | null }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "RESET" };

export function reducer(state: KnowledgeTableState, action: KnowledgeTableAction): KnowledgeTableState {
  switch (action.type) {
    case "SET_STAGE":
      return { ...state, stage: action.stage };
    case "SET_FIRST_CHOICE":
      return { ...state, firstChoice: action.choice };
    case "SET_SECOND_CHOICE":
      return { ...state, secondChoice: action.choice };
    case "SET_POSITION_CHANGE":
      return { ...state, positionChange: action.choice };
    case "SET_TENDENCY":
      return { ...state, tendency: action.choice };
    case "SET_COLLISION_POINT":
      return { ...state, collisionPoint: action.point };
    case "SET_COLLISION":
      return { ...state, collision: action.collision, collisionRevealedSeats: action.collision ? state.collisionRevealedSeats : [] };
    case "REVEAL_COLLISION_SEAT":
      return state.collisionRevealedSeats.includes(action.seatId) ? state : { ...state, collisionRevealedSeats: [...state.collisionRevealedSeats, action.seatId] };
    case "SET_DIVERGENCES":
      return { ...state, divergences: action.divergences };
    case "SET_CONFIRMED_DIVERGENCE":
      return { ...state, confirmedDivergence: action.value };
    case "SET_PERSPECTIVE":
      return { ...state, perspective: action.perspective };
    case "SET_THIRD_SEAT":
      return { ...state, thirdSeatInvited: action.invited };
    case "SET_FOLLOWUP":
      return { ...state, followupSeatId: action.seatId, followup: action.result ?? null };
    case "ADD_FOLLOWUP":
      return {
        ...state,
        followup: action.result,
        followupHistory: {
          ...state.followupHistory,
          [action.seatId]: [...(state.followupHistory[action.seatId] ?? []), { question: action.question, result: action.result }],
        },
      };
    case "TOGGLE_LIKE":
      return { ...state, likedQuotes: state.likedQuotes.includes(action.quote) ? state.likedQuotes.filter((quote) => quote !== action.quote) : [...state.likedQuotes, action.quote] };
    case "REVEAL_SEAT":
      return state.revealedSeats.includes(action.seatId) ? state : { ...state, revealedSeats: [...state.revealedSeats, action.seatId] };
    case "ADD_RESPONSE":
      return { ...state, responses: [...state.responses, action.response] };
    case "SET_SUMMARY":
      return { ...state, summary: action.summary };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// 选择器
export const selectLatestResponse = (s: KnowledgeTableState): ResponseWithRound | undefined => s.responses.at(-1);
export const selectActiveSeat = (s: KnowledgeTableState) =>
  s.stage === "collision-response" ? s.collision?.response.seatId : undefined;
export const selectDemoMode = (s: KnowledgeTableState) =>
  s.responses.some((r) => r.mode === "fallback") ||
  s.collision?.mode === "fallback" ||
  s.followup?.mode === "fallback" ||
  s.perspective?.mode === "fallback" ||
  s.summary?.mode === "fallback";

/**
 * 把 KnowledgeTableState 投影到 user 域的 UserSession。
 * director / summary / analysis 等下游消费者应通过此选择器读 user 数据，
 * 而不是直接读 state 的原始字段（详见 .harness/agents/user.md "与其他 agent 的边界"）。
 */
export const selectUserSession = (s: KnowledgeTableState): UserSession => ({
  firstChoice: s.firstChoice,
  secondChoice: s.secondChoice,
  positionChange: s.positionChange,
  respondedSeatIds: s.responses.map((r) => r.selectedSeatId),
});
