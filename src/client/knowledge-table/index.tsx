// src/client/knowledge-table/index.tsx
// KnowledgeTable 入口。薄壳：状态机 + 7 stage 分发 + API 调用。
// 详见 .harness/AGENTS.md 与 .harness/rules/ui-invariance.md。

"use client";

import { useReducer } from "react";
import { seats, topic } from "@/data";
import type { DiscussResult, FirstChoice, PositionChange, SecondChoice, SummaryResult } from "@/lib/types";

import { HomeStage } from "./stages/HomeStage";
import { IntroStage } from "./stages/IntroStage";
import { ChoiceStage } from "./stages/ChoiceStage";
import { ResponseStage } from "./stages/ResponseStage";
import { ResultStage } from "./stages/ResultStage";
import { HostStrip } from "./components/HostStrip";
import { ProgressBar } from "./components/ProgressBar";
import { SeatCard } from "./components/SeatCard";
import { UserSeat } from "./components/UserSeat";
import { firstOptions, secondOptions, reflectionOptions } from "./constants";
import { hostText } from "./hostText";
import {
  initialState,
  reducer,
  selectActiveSeat,
  selectDemoMode,
  selectLatestResponse,
  type Stage,
} from "./state";
import { postJSON } from "./api";

export default function KnowledgeTable() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const latest = selectLatestResponse(state);
  const activeSeat = selectActiveSeat(state);
  const demoMode = selectDemoMode(state);

  const chooseFirst = async (choice: FirstChoice) => {
    if (state.loading || state.firstChoice) return;
    dispatch({ type: "SET_FIRST_CHOICE", choice });
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<DiscussResult>("/api/discuss", {
        round: 1,
        firstChoice: choice,
        secondChoice: null,
        respondedSeatIds: [],
      });
      dispatch({ type: "ADD_RESPONSE", response: { ...result, round: 1 } });
      dispatch({ type: "SET_STAGE", stage: "round1-response" });
    } catch {
      dispatch({ type: "SET_FIRST_CHOICE", choice: null });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const chooseSecond = async (choice: SecondChoice) => {
    if (state.loading || state.secondChoice || !state.firstChoice) return;
    dispatch({ type: "SET_SECOND_CHOICE", choice });
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<DiscussResult>("/api/discuss", {
        round: 2,
        firstChoice: state.firstChoice,
        secondChoice: choice,
        respondedSeatIds: state.responses.map((r) => r.selectedSeatId),
      });
      dispatch({ type: "ADD_RESPONSE", response: { ...result, round: 2 } });
      dispatch({ type: "SET_STAGE", stage: "round2-response" });
    } catch {
      dispatch({ type: "SET_SECOND_CHOICE", choice: null });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const chooseReflection = async (choice: PositionChange) => {
    if (state.loading || state.positionChange || !state.firstChoice || !state.secondChoice) return;
    dispatch({ type: "SET_POSITION_CHANGE", choice });
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<SummaryResult>("/api/summary", {
        firstChoice: state.firstChoice,
        secondChoice: state.secondChoice,
        positionChange: choice,
        respondedSeatIds: state.responses.map((r) => r.selectedSeatId),
      });
      dispatch({ type: "SET_SUMMARY", summary: result });
      dispatch({ type: "SET_STAGE", stage: "result" });
    } catch {
      dispatch({ type: "SET_POSITION_CHANGE", choice: null });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const reset = () => {
    dispatch({ type: "RESET" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (state.stage === "home") {
    return <HomeStage onJoin={() => dispatch({ type: "SET_STAGE", stage: "intro" })} />;
  }

  if (state.stage === "result" && state.summary) {
    return <ResultStage summary={state.summary} onReset={reset} />;
  }

  return (
    <main className="discussion-page">
      <header className="topbar">
        <button className="wordmark" onClick={reset}>
          知识拼桌
        </button>
        <ProgressBar stage={state.stage as Stage} />
        {demoMode ? <span className="demo-badge">演示模式</span> : <span />}
      </header>
      <HostStrip text={hostText(state.stage, latest, state.loading)} />
      <section className="table-area">
        <div className="seat-grid">
          {seats.map((seat, index) => (
            <SeatCard
              key={seat.id}
              seat={seat}
              index={index}
              active={Boolean(activeSeat)}
              isSpeaking={activeSeat === seat.id}
              latest={latest}
            />
          ))}
        </div>
        <UserSeat>
          {state.stage === "intro" && (
            <IntroStage onProceed={() => dispatch({ type: "SET_STAGE", stage: "round1-choice" })} />
          )}
          {state.stage === "round1-choice" && (
            <ChoiceStage
              title="如果是现在的你，更接近哪一种想法？"
              options={firstOptions}
              loading={state.loading}
              onChoose={(id) => chooseFirst(id as FirstChoice)}
            />
          )}
          {state.stage === "round1-response" && latest && (
            <ResponseStage
              result={latest}
              button="进入具体情境"
              onProceed={() => dispatch({ type: "SET_STAGE", stage: "round2-choice" })}
            />
          )}
          {state.stage === "round2-choice" && (
            <ChoiceStage
              title={topic.scenario}
              options={secondOptions}
              loading={state.loading}
              onChoose={(id) => chooseSecond(id as SecondChoice)}
            />
          )}
          {state.stage === "round2-response" && latest && (
            <ResponseStage
              result={latest}
              button="看看我的想法"
              onProceed={() => dispatch({ type: "SET_STAGE", stage: "reflection" })}
            />
          )}
          {state.stage === "reflection" && (
            <ChoiceStage
              title="两轮下来，你的想法有变化吗？"
              subtitle="调整判断不代表前面选错了。"
              options={reflectionOptions}
              loading={state.loading}
              onChoose={(id) => chooseReflection(id as PositionChange)}
            />
          )}
        </UserSeat>
      </section>
      <footer className="mock-note">基于 20 话题 × 3 派 1175 条真实知乎回答库（RAG cosine 检索 top-3）。每条 reply 附原文链接。</footer>
    </main>
  );
}
