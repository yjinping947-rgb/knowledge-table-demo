// src/client/knowledge-table/state.ts
// KnowledgeTable 的状态机。详见 .harness/AGENTS.md 与 .harness/rules/ui-invariance.md。

import type { DiscussResult, FirstChoice, PositionChange, SecondChoice, SummaryResult } from "@/lib/types";
import type { UserSession } from "../../user";

export type Stage =
  | "home"
  | "intro"
  | "round1-choice"
  | "round1-response"
  | "round2-choice"
  | "round2-response"
  | "reflection"
  | "result";

export type ResponseWithRound = DiscussResult & { round: number };

export type KnowledgeTableState = {
  stage: Stage;
  firstChoice: FirstChoice | null;
  secondChoice: SecondChoice | null;
  positionChange: PositionChange | null;
  responses: ResponseWithRound[];
  summary: SummaryResult | null;
  loading: boolean;
};

export const initialState: KnowledgeTableState = {
  stage: "home",
  firstChoice: null,
  secondChoice: null,
  positionChange: null,
  responses: [],
  summary: null,
  loading: false,
};

export type KnowledgeTableAction =
  | { type: "SET_STAGE"; stage: Stage }
  | { type: "SET_FIRST_CHOICE"; choice: FirstChoice | null }
  | { type: "SET_SECOND_CHOICE"; choice: SecondChoice | null }
  | { type: "SET_POSITION_CHANGE"; choice: PositionChange | null }
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
  s.stage.includes("response") ? selectLatestResponse(s)?.selectedSeatId : undefined;
export const selectDemoMode = (s: KnowledgeTableState) =>
  s.responses.some((r) => r.mode === "fallback") || s.summary?.mode === "fallback";

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
