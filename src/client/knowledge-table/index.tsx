// src/client/knowledge-table/index.tsx
// KnowledgeTable 入口。薄壳：状态机 + 7 stage 分发 + API 调用。
// 详见 .harness/AGENTS.md 与 .harness/rules/ui-invariance.md。

"use client";

import { useReducer } from "react";
import { seats, topic } from "@/data";
import type {
  CollisionPoint,
  CollisionResult,
  DivergenceCandidate,
  FollowupResult,
  PerspectiveResult,
  SeatId,
  SummaryResult,
  TendencyChoice,
} from "@/lib/types";

import { HomeStage } from "./stages/HomeStage";
import { IntroStage } from "./stages/IntroStage";
import { ChoiceStage } from "./stages/ChoiceStage";
import { ResultStage } from "./stages/ResultStage";
import { CollisionPointStage } from "./stages/CollisionPointStage";
import { DivergenceStage } from "./stages/DivergenceStage";
import { FollowupStage } from "./stages/FollowupStage";
import { PerspectivePreviewStage } from "./stages/PerspectivePreviewStage";
import { HostStrip } from "./components/HostStrip";
import { ProgressBar } from "./components/ProgressBar";
import { SeatCard } from "./components/SeatCard";
import { UserSeat } from "./components/UserSeat";
import { collisionPointsForTopic, tendencyOptions } from "./constants";
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
import { discussionTopic } from "./topicConfig";

export default function KnowledgeTable({
  topicId = "T01",
  topicTitle = topic.question,
}: {
  topicId?: string;
  topicTitle?: string;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const currentTopic = discussionTopic(topicId, topicTitle);
  const generalStances = {
    action: "先行动再修正，别让犹豫把问题拖成更大的成本。",
    realist: "先把资源、风险和可承受的代价算清楚，再做改变。",
    conditional: "没有统一答案，关键是把触发条件和边界设清楚。",
  } as const;
  const latest = selectLatestResponse(state);
  const activeSeat = selectActiveSeat(state);
  const demoMode = selectDemoMode(state);

  const points = collisionPointsForTopic();

  const chooseTendency = (choice: TendencyChoice) => {
    if (state.loading || state.tendency) return;
    const firstChoice = choice === "closer_first" ? "support_quit" : choice === "closer_second" ? "oppose_quit" : "depends";
    dispatch({ type: "SET_TENDENCY", choice });
    dispatch({ type: "SET_FIRST_CHOICE", choice: firstChoice });
    dispatch({ type: "SET_STAGE", stage: "collision-point" });
  };

  const chooseCollision = async (point: CollisionPoint) => {
    if (state.loading || state.collisionPoint || !state.tendency) return;
    const secondChoice = point.seatId === "action" ? "leave_now" : "wait_offer";
    dispatch({ type: "SET_COLLISION_POINT", point });
    dispatch({ type: "SET_SECOND_CHOICE", choice: secondChoice });
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<CollisionResult>("/api/collision", {
        topicId: currentTopic.id,
        tendency: state.tendency,
        selectedSeatId: point.seatId,
        collisionPoint: point.text,
      });
      dispatch({ type: "SET_COLLISION", collision: result });
      dispatch({ type: "SET_STAGE", stage: "collision-response" });
    } catch {
      dispatch({ type: "SET_COLLISION_POINT", point: null });
      dispatch({ type: "SET_SECOND_CHOICE", choice: null });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const loadDivergences = async () => {
    if (state.loading || !state.tendency || !state.collisionPoint || !state.collision) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<{ candidates: DivergenceCandidate[] }>("/api/divergence", {
        topicId: currentTopic.id,
        tendency: state.tendency,
        selectedSeatId: state.collisionPoint.seatId,
        collisionPoint: state.collisionPoint.text,
        challenge: state.collision.challenge.reply,
        response: state.collision.response.reply,
      });
      dispatch({ type: "SET_DIVERGENCES", divergences: result.candidates });
      dispatch({ type: "SET_STAGE", stage: "divergence" });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const generatePerspective = async (excludedNames: string[] = []) => {
    if (state.loading || !state.collisionPoint || !state.confirmedDivergence) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<PerspectiveResult>("/api/perspective", {
        topicId: currentTopic.id,
        selectedSeatId: state.collisionPoint.seatId,
        collisionPoint: state.collisionPoint.text,
        confirmedDivergence: state.confirmedDivergence,
        excludedNames,
      });
      dispatch({ type: "SET_PERSPECTIVE", perspective: result });
      dispatch({ type: "SET_STAGE", stage: "perspective-preview" });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const confirmDivergence = async (value: string) => {
    if (state.loading || !state.collisionPoint) return;
    dispatch({ type: "SET_CONFIRMED_DIVERGENCE", value });
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<PerspectiveResult>("/api/perspective", {
        topicId: currentTopic.id,
        selectedSeatId: state.collisionPoint.seatId,
        collisionPoint: state.collisionPoint.text,
        confirmedDivergence: value,
        excludedNames: [],
      });
      dispatch({ type: "SET_PERSPECTIVE", perspective: result });
      dispatch({ type: "SET_STAGE", stage: "perspective-preview" });
    } catch {
      dispatch({ type: "SET_CONFIRMED_DIVERGENCE", value: null });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const finishSummary = async () => {
    if (
      state.loading ||
      !state.firstChoice ||
      !state.secondChoice ||
      !state.tendency ||
      !state.collisionPoint ||
      !state.collision ||
      !state.confirmedDivergence
    ) {
      return;
    }
    dispatch({ type: "SET_POSITION_CHANGE", choice: "slightly_changed" });
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<SummaryResult>("/api/summary", {
        flow: "knowledge-table-v2",
        topicId: currentTopic.id,
        firstChoice: state.firstChoice,
        secondChoice: state.secondChoice,
        positionChange: "slightly_changed",
        respondedSeatIds: [state.collisionPoint.seatId],
        tendency: state.tendency,
        collisionPoint: state.collisionPoint.text,
        challenge: state.collision.challenge.reply,
        response: state.collision.response.reply,
        confirmedDivergence: state.confirmedDivergence,
        perspectiveName: state.perspective?.name ?? "",
        perspectiveReframe: state.perspective?.reframe ?? "",
      });
      dispatch({ type: "SET_SUMMARY", summary: result });
      dispatch({ type: "SET_STAGE", stage: "result" });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const askFollowup = (seatId: SeatId) => {
    if (state.loading || seatId === "conditional") return;
    dispatch({ type: "SET_FOLLOWUP", seatId, result: null });
  };

  const submitFollowup = async (question: string) => {
    if (state.loading || !state.followupSeatId) return;
    const seatId = state.followupSeatId;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const result = await postJSON<FollowupResult>("/api/followup", {
        topicId: currentTopic.id,
        seatId,
        question,
      });
      dispatch({ type: "SET_FOLLOWUP", seatId, result });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const reset = () => {
    dispatch({ type: "RESET" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueWithBothSeats = () => {
    dispatch({ type: "SET_COLLISION_POINT", point: null });
    dispatch({ type: "SET_COLLISION", collision: null });
    dispatch({ type: "SET_DIVERGENCES", divergences: [] });
    dispatch({ type: "SET_CONFIRMED_DIVERGENCE", value: null });
    dispatch({ type: "SET_PERSPECTIVE", perspective: null });
    dispatch({ type: "SET_THIRD_SEAT", invited: false });
    dispatch({ type: "SET_STAGE", stage: "collision-point" });
  };

  if (state.stage === "home") {
    return <HomeStage topic={currentTopic} onJoin={() => dispatch({ type: "SET_STAGE", stage: "intro" })} />;
  }

  if (state.stage === "result" && state.summary) {
    return <ResultStage summary={state.summary} onReset={reset} topicId={currentTopic.id} topicTitle={currentTopic.question} />;
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
      <HostStrip text={hostText(state.stage, latest, state.loading, currentTopic.question)} />
      <section className="table-area">
        <div className="seat-grid">
          {seats
            .filter((seat) => seat.id !== "conditional" || (state.thirdSeatInvited && state.perspective))
            .map((seat, index) => {
              const isThirdSeat = seat.id === "conditional";
              return (
                <SeatCard
                  key={seat.id}
                  seat={seat}
                  index={index}
                  active={Boolean(activeSeat)}
                  isSpeaking={activeSeat === seat.id}
                  latest={latest}
                  stance={currentTopic.id === "T01" ? undefined : generalStances[seat.id]}
                  collision={state.collision}
                  perspective={isThirdSeat ? state.perspective : null}
                  frameworkReply={
                    state.thirdSeatInvited && !isThirdSeat
                      ? seat.id === "action"
                        ? "这个视角没有取消行动，而是把行动前要保护的东西说得更具体了。"
                        : "它也提醒我，风险控制不是停在原地，而是保留下一步调整的空间。"
                      : undefined
                  }
                  onAsk={seat.id === "action" || seat.id === "realist" ? askFollowup : undefined}
                />
              );
            })}
        </div>
        {state.stage === "intro" ? (
          <IntroStage onProceed={() => dispatch({ type: "SET_STAGE", stage: "tendency" })} />
        ) : (
          <UserSeat>
            {state.followupSeatId ? (
              <FollowupStage
                seatId={state.followupSeatId}
                result={state.followup}
                loading={state.loading}
                onSubmit={submitFollowup}
                onBack={() => dispatch({ type: "SET_FOLLOWUP", seatId: null, result: null })}
              />
            ) : (
              <>
                {state.stage === "tendency" && (
                  <ChoiceStage
                    title="两席说完了，现在你更接近哪一种判断？"
                    subtitle="这只是本桌思考轨迹的起点，不是最终结论。"
                    options={tendencyOptions}
                    loading={state.loading}
                    onChoose={chooseTendency}
                  />
                )}
                {state.stage === "collision-point" && (
                  <CollisionPointStage points={points} loading={state.loading} onChoose={chooseCollision} />
                )}
                {state.stage === "collision-response" && state.collision && (
                  <>
                    <div className="host-summary">
                      <span>主持人捋了捋</span>
                      <p>{state.collision.hostComment}</p>
                    </div>
                    <button className="primary dark" disabled={state.loading} onClick={loadDivergences}>
                      找出隐藏分歧 <span>→</span>
                    </button>
                  </>
                )}
                {state.stage === "divergence" && (
                  <DivergenceStage
                    candidates={state.divergences}
                    loading={state.loading}
                    onConfirm={(value) => confirmDivergence(value)}
                  />
                )}
                {state.stage === "perspective-preview" && state.perspective && (
                  <PerspectivePreviewStage
                    perspective={state.perspective}
                    loading={state.loading}
                    onInvite={() => {
                      dispatch({ type: "SET_THIRD_SEAT", invited: true });
                      dispatch({ type: "SET_STAGE", stage: "third-seat" });
                    }}
                    onChange={() => generatePerspective([state.perspective?.name ?? ""])}
                    onContinue={continueWithBothSeats}
                    onOrganize={finishSummary}
                  />
                )}
                {state.stage === "third-seat" && state.perspective && (
                  <>
                    <h2>第三席已经入桌</h2>
                    <p>它不替你裁决，而是把刚才确认的分歧换成一个可以继续使用的判断框架。</p>
                    <div className="host-summary">
                      <span>{state.perspective.name}</span>
                      <p>{state.perspective.reply}</p>
                    </div>
                    {state.perspective.sourceUrls?.[0] && (
                      <a className="reply-source" href={state.perspective.sourceUrls[0]} rel="noreferrer" target="_blank">
                        查看相关知乎原文 ↗
                      </a>
                    )}
                    <button className="primary dark" disabled={state.loading} onClick={finishSummary}>
                      整理本桌思考轨迹 <span>→</span>
                    </button>
                  </>
                )}
              </>
            )}
          </UserSeat>
        )}
      </section>
      <footer className="mock-note">基于 20 话题 × 3 派 1175 条真实知乎回答库（RAG cosine 检索 top-3）。每条 reply 附原文链接。</footer>
    </main>
  );
}
