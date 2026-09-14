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
import { LoadingGame } from "./components/LoadingGame";
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
import { seatLabelsForTopic } from "@/lib/session/seatLabels";

export default function KnowledgeTable({
  topicId = "T01",
  topicTitle = topic.question,
}: {
  topicId?: string;
  topicTitle?: string;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const currentTopic = discussionTopic(topicId, topicTitle);
  const customQuestion = topicId === "CUSTOM" ? topicTitle.replace(/[？?]$/, "") : undefined;
  const seatLabels = seatLabelsForTopic(topicId, currentTopic.question);
  const topicPayload = customQuestion ? { topicId: currentTopic.id, customQuestion } : { topicId: currentTopic.id };
  const latest = selectLatestResponse(state);
  const activeSeat = selectActiveSeat(state);
  const demoMode = selectDemoMode(state);
  const toggleLike = (quote: string) => dispatch({ type: "TOGGLE_LIKE", quote });

  const points = collisionPointsForTopic(currentTopic.id, currentTopic.question.replace(/[？?]$/, ""), state.tendency);

  const proceedIntro = async () => {
    if (state.loading) return;
    const seatId: SeatId | null = !state.revealedSeats.includes("action") ? "action" : !state.revealedSeats.includes("realist") ? "realist" : null;
    if (seatId) {
      dispatch({ type: "SET_LOADING", loading: true });
      try {
        const result = await postJSON<import("@/lib/types").DiscussResult>("/api/discuss", {
          ...topicPayload,
          round: 1,
          firstChoice: seatId === "action" ? "support_quit" : "oppose_quit",
          secondChoice: null,
          respondedSeatIds: state.revealedSeats,
          previousReply: state.responses.at(-1)?.reply ?? "",
        });
        dispatch({ type: "ADD_RESPONSE", response: { ...result, round: 1 } });
        dispatch({ type: "REVEAL_SEAT", seatId });
      } finally {
        dispatch({ type: "SET_LOADING", loading: false });
      }
      return;
    }
    dispatch({ type: "SET_STAGE", stage: "tendency" });
  };

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
        ...topicPayload,
        tendency: state.tendency,
        selectedSeatId: point.seatId,
        collisionPoint: point.text,
        firstSeatReply: state.responses.find((response) => response.selectedSeatId === "action")?.reply ?? "",
        secondSeatReply: state.responses.find((response) => response.selectedSeatId === "realist")?.reply ?? "",
        userContext: Object.values(state.followupHistory).flat().map((turn) => `用户：${turn.question}\n回应：${turn.result.reply}`).join("\n").slice(-500),
      });
      dispatch({ type: "SET_COLLISION", collision: result });
      dispatch({ type: "REVEAL_COLLISION_SEAT", seatId: "action" });
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
        ...topicPayload,
        tendency: state.tendency,
        selectedSeatId: state.collisionPoint.seatId,
        collisionPoint: state.collisionPoint.text,
        challenge: state.collision.challenge.reply,
        response: state.collision.response.reply,
        userContext: Object.values(state.followupHistory).flat().map((turn) => `用户：${turn.question}；回应：${turn.result.reply}`).join("\n").slice(-500),
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
        ...topicPayload,
        selectedSeatId: state.collisionPoint.seatId,
        collisionPoint: state.collisionPoint.text,
        confirmedDivergence: state.confirmedDivergence,
        excludedNames,
        userContext: Object.values(state.followupHistory).flat().map((turn) => `用户：${turn.question}；回应：${turn.result.reply}`).join("\n").slice(-1200),
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
        ...topicPayload,
        selectedSeatId: state.collisionPoint.seatId,
        collisionPoint: state.collisionPoint.text,
        confirmedDivergence: value,
        excludedNames: [],
        userContext: Object.values(state.followupHistory).flat().map((turn) => `用户：${turn.question}；回应：${turn.result.reply}`).join("\n").slice(-1200),
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
        ...topicPayload,
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
        followupTurns: Object.entries(state.followupHistory).flatMap(([seatId, turns]) =>
          (turns ?? []).map((turn) => ({ seatId, question: turn.question, reply: turn.result.reply })),
        ),
        likedQuotes: state.likedQuotes,
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
        ...topicPayload,
        seatId,
        question,
        context: (state.followupHistory[seatId] ?? [])
          .map((turn) => `用户：${turn.question}\n${seatId}席：${turn.result.reply}`)
          .join("\n"),
      });
      dispatch({ type: "ADD_FOLLOWUP", seatId, question, result });
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
            .filter((seat) => seat.id !== "conditional" || (state.thirdSeatInvited && state.perspective) || !state.thirdSeatInvited)
            .map((seat, index) => {
              const isThirdSeat = seat.id === "conditional";
              return (
                <SeatCard
                  key={seat.id}
                  seat={seat}
                  index={index}
                  active={state.stage === "intro"
                    ? state.revealedSeats.length > 0 && (!state.revealedSeats.includes(seat.id) || (state.revealedSeats.length > 1 && seat.id === "action"))
                    : state.stage === "collision-response"
                      ? state.collisionRevealedSeats.at(-1) !== seat.id && seat.id !== "conditional"
                      : Boolean(activeSeat)}
                  isSpeaking={state.stage === "intro"
                    ? state.revealedSeats.at(-1) === seat.id
                    : state.stage === "collision-response"
                      ? state.collisionRevealedSeats.at(-1) === seat.id
                      : activeSeat === seat.id}
                  latest={state.responses.find((response) => response.round === 1 && response.selectedSeatId === seat.id) ?? latest}
                  introReply={state.responses.find((response) => response.round === 1 && response.selectedSeatId === seat.id)?.reply}
                  introSourceIds={state.responses.find((response) => response.round === 1 && response.selectedSeatId === seat.id)?.sourceIds}
                  stance={undefined}
                  collision={state.stage === "collision-response" && !state.collisionRevealedSeats.includes(seat.id) ? null : state.collision}
                  perspective={isThirdSeat ? state.perspective : null}
                  frameworkReply={
                    state.thirdSeatInvited && !isThirdSeat
                      ? seat.id === "action"
                        ? "这个视角没有取消行动，而是把行动前要保护的东西说得更具体了。"
                        : "它也提醒我，风险控制不是停在原地，而是保留下一步调整的空间。"
                      : undefined
                  }
                  onAsk={seat.id === "action" || seat.id === "realist" ? askFollowup : undefined}
                  likedQuotes={state.likedQuotes}
                  onLike={toggleLike}
                  revealed={seat.id === "conditional" || state.revealedSeats.includes(seat.id)}
                  placeholder={seat.id === "conditional" && !(state.thirdSeatInvited && state.perspective)}
                  seatLabel={seatLabels[seat.id]}
                />
              );
            })}
        </div>
        {state.stage === "intro" && !state.followupSeatId ? (
          <IntroStage revealedSeats={state.revealedSeats} loading={state.loading} onProceed={proceedIntro} seatLabels={seatLabels} />
        ) : (
          <UserSeat>
            <LoadingGame active={state.loading} text={state.stage === "third-seat" ? "正在把这桌讨论整理成知识卡片……" : "正在准备下一段对话……"} />
            {state.followupSeatId ? (
              <FollowupStage
                seatId={state.followupSeatId}
                result={state.followup}
                history={state.followupHistory[state.followupSeatId] ?? []}
                loading={state.loading}
                onSubmit={submitFollowup}
                onContinue={() => dispatch({ type: "SET_FOLLOWUP", seatId: state.followupSeatId, result: null })}
                onBack={() => dispatch({ type: "SET_FOLLOWUP", seatId: null, result: null })}
                likedQuotes={state.likedQuotes}
                onLike={toggleLike}
                backLabel={state.revealedSeats.includes("action") && !state.revealedSeats.includes("realist") ? "先不问，继续听下一席" : "先不问，回到主持人位"}
                seatLabels={seatLabels}
              />
            ) : (
              <>
                {state.stage === "tendency" && (
                  <ChoiceStage
                    title="两席都听完了，先校准一下你的想法"
                    subtitle="不用急着站队。你现在更在意什么，会决定我们接下来重点聊哪一个卡点。"
                    options={tendencyOptions}
                    loading={state.loading}
                    onChoose={chooseTendency}
                  />
                )}
                {state.stage === "collision-point" && (
                  <CollisionPointStage points={points} loading={state.loading} onChoose={chooseCollision} seatLabels={seatLabels} />
                )}
                {state.stage === "collision-response" && state.collision && (
                  <>
                    {state.collisionRevealedSeats.length < 2 ? (
                      <>
                        <h2>第一席说完了，再听听另一席怎么想</h2>
                        <p>两席都会回应你刚才选中的同一个问题。</p>
                        <button className="primary dark" disabled={state.loading} onClick={() => dispatch({ type: "REVEAL_COLLISION_SEAT", seatId: "realist" })}>听下一席回应 <span>→</span></button>
                      </>
                    ) : (
                      <>
                        <div className="host-summary"><span>主持人捋了捋</span><p>{state.collision.hostComment}</p></div>
                        <button className="primary dark" disabled={state.loading} onClick={loadDivergences}>继续说说你的想法 <span>→</span></button>
                      </>
                    )}
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
                      {state.loading ? "正在生成总结…" : "生成这桌总结"} <span>→</span>
                    </button>
                  </>
                )}
              </>
            )}
          </UserSeat>
        )}
      </section>
      <footer className="mock-note">知乎实时内容优先；暂时不可用时回退到已清洗的 20 个话题语料库。观点由 AI 综合生成，原文链接可核查。</footer>
    </main>
  );
}
