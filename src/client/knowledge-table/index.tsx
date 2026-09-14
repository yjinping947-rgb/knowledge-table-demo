// 知识拼桌 V2.5 主入口：顺序听席、拖动碰撞、可选第三席与分享结果。

"use client";

import { useMemo, useReducer, useRef } from "react";
import { seats, topic } from "@/data";
import type { CollisionPoint, CollisionResult, DivergenceCandidate, FollowupResult, PerspectiveResult, SeatId, SummaryResult, TendencyChoice } from "@/lib/types";

import { HomeStage } from "./stages/HomeStage";
import { IntroStage } from "./stages/IntroStage";
import { ChoiceStage } from "./stages/ChoiceStage";
import { ResultStage } from "./stages/ResultStage";
import { CollisionPointStage } from "./stages/CollisionPointStage";
import { CollisionDragStage } from "./stages/CollisionDragStage";
import { DivergenceStage } from "./stages/DivergenceStage";
import { ExitUnderstandingStage } from "./stages/ExitUnderstandingStage";
import { FollowupStage } from "./stages/FollowupStage";
import { PerspectivePreviewStage } from "./stages/PerspectivePreviewStage";
import { SeatStatementStage } from "./stages/SeatStatementStage";
import { HostStrip } from "./components/HostStrip";
import { KeySetup } from "./components/KeySetup";
import { ProgressBar } from "./components/ProgressBar";
import { SeatCard } from "./components/SeatCard";
import { UserSeat } from "./components/UserSeat";
import { collisionPointsForTopic, tendencyOptions } from "./constants";
import { hostText } from "./hostText";
import { createInitialState, reducer, selectDemoMode, selectLoading, type RequestKind, type Stage } from "./state";
import { postJSON } from "./api";
import { discussionTopic } from "./topicConfig";

type ApiEnvelope = { sessionId?: string; requestId?: string; topicId?: string; mode?: string };
type FollowupPayload = FollowupResult & ApiEnvelope;
type CollisionPayload = CollisionResult & ApiEnvelope;
type PerspectivePayload = PerspectiveResult & ApiEnvelope;
type SummaryPayload = SummaryResult & ApiEnvelope & {
  discussionMap?: SummaryResult["discussionMap"];
  soulSentence?: string;
};

function responseMatchesRequest(value: unknown, requestId: string, sessionId: string, topicId: string): boolean {
  if (!value || typeof value !== "object") return false;
  const envelope = value as ApiEnvelope;
  // 兼容旧路由：缺少元数据时仍接受响应；一旦回传则必须与当前请求完全一致。
  return (!envelope.requestId || envelope.requestId === requestId)
    && (!envelope.sessionId || envelope.sessionId === sessionId)
    && (!envelope.topicId || envelope.topicId === topicId);
}

const seatById = (id: SeatId) => seats.find((seat) => seat.id === id) ?? seats[0];
const makeId = (prefix: string) => `${prefix}_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;

function safeMode(mode: string | undefined): "generated" | "retrieval" | "fallback" | "ai" {
  return mode === "generated" || mode === "retrieval" || mode === "fallback" || mode === "ai" ? mode : "fallback";
}

function fallbackFollowup(
  seatId: "action" | "realist",
  question: string,
  meta: Required<Pick<ApiEnvelope, "sessionId" | "requestId" | "topicId">>,
): FollowupPayload {
  const childContext = /孩子|家人|照护|生病|家庭/.test(question);
  const reply = seatId === "action"
    ? childContext
      ? "如果家人需要照护，行动派的重点不是逼你立刻裸辞，而是先把照护和身心底线放在前面：能否请假、调岗或获得支持？当工作已经让你无法照顾家人且短期没有改善，离开可以是保护责任的一步。"
      : "如果继续等待也在持续消耗身心，先停止损失本身就是一种行动。关键是确认消耗是否已经超过恢复能力，并为收入和下一步保留最低缓冲。"
    : childContext
      ? "家人需要照护时，现金流、医疗支出和可替代照护都要一起算进安全线。可以先请假、协商弹性或确认支持网络；如果必须裸辞，也要先明确最低生活储备和求职期限。"
      : "先把现金流、替代方案和最坏情况列出来，能承受风险再行动，会比只凭当下情绪更稳。设置期限并不等于拖延，而是保留选择权。";
  return {
    sessionId: meta.sessionId,
    requestId: meta.requestId,
    topicId: meta.topicId,
    seatId,
    reply,
    sourceIds: [],
    sourceSeatIds: [seatId],
    mode: "fallback",
  } as FollowupPayload;
}

function fallbackCollision(point: CollisionPoint, sessionId: string, requestId: string, topicId: string): CollisionPayload {
  const original = point.seatId === "realist" ? "realist" : "action";
  const opposing = original === "action" ? "realist" : "action";
  const challenge = original === "action"
    ? "现实派会追问：即使工作在消耗你，为什么一定要现在裸辞？请假、缓冲和下一份工作的线索是否已经准备好？"
    : "行动派会追问：等待 offer 的安全感，会不会让持续的身心损耗变成更难恢复的代价？你准备等到什么信号才行动？";
  const response = original === "action"
    ? "行动派回应：缓冲方案只有在现实中可执行时才成立。如果反复沟通仍无改善，继续留下同样有成本；离开前要先写清保护边界和最低储备。"
    : "现实派回应：并不是所有等待都等于拖延。只要设置明确期限、现金安全线和退出条件，准备过程也可以是在主动保留选择权。";
  return {
    sessionId,
    requestId,
    topicId,
    challenge: { seatId: opposing, reply: challenge, sourceIds: [], sourceSeatIds: [opposing] },
    response: { seatId: original, reply: response, sourceIds: [], sourceSeatIds: [original] },
    conversationQuoteIds: ["collision-question", "collision-challenge", "collision-response"],
    hostComment: `围绕「${point.text}」，两席完成了一次质疑与回应。真正不同的，是损失的优先级和行动的触发线。`,
    mode: "fallback",
  } as CollisionPayload;
}

function fallbackPerspective(value: string, sessionId: string, requestId: string, topicId: string): PerspectivePayload {
  return {
    sessionId,
    requestId,
    topicId,
    name: "选择权保留视角",
    basis: `来自两席碰撞后确认的隐藏分歧：${value}`,
    reframe: "真正的问题不只是该不该离开，而是哪条路径既能避免更难恢复的损失，又能保留后续调整空间。",
    tool: "分别列出不可逆损失、仍可保留的选项与下一次复查触发线，再选择当前最小但有效的一步。",
    reply: "先不急着裁决谁对谁错，把选择拆成现在必须保护什么、还能保留什么、何时重新判断。",
    sourceIds: [],
    sourceSeatIds: ["conditional"],
    origin: "ai_synthesis",
    generatedFrom: { divergenceId: "user-confirmed", conversationQuoteIds: [] },
    claims: [],
    sourceStatus: "insufficient",
    sourceNotice: "本桌材料足以生成一个判断框架，但不足以把它归为某位知乎答主的观点。",
    mode: "fallback",
  } as PerspectivePayload;
}

function fallbackSummary(state: ReturnType<typeof createInitialState>, question: string): SummaryPayload {
  const start = state.tendency === "closer_first" ? "action" : state.tendency === "closer_second" ? "realist" : "undecided";
  const end = state.thirdSeatInvited ? "conditional" : start;
  const confirmed = state.confirmedDivergence || "行动时机与安全线如何同时成立";
  // 离桌表达是用户可能带有私密上下文的自由输入。即使网络失败走客户端
  // 兜底，也只保留“已留下理解”这一粗粒度状态，不把原文带进结果卡。
  const hasDepartureReflection = Boolean(state.exitUnderstanding?.trim());
  return {
    consensus: "两席都在保护未来，只是优先级不同。",
    disagreement: confirmed,
    hiddenAssumption: "你需要的不是统一答案，而是一条能被现实验证的边界。",
    openQuestion: hasDepartureReflection ? "你留下了一条离桌理解，下一步要用什么信号验证它？" : "下一次出现什么信号时，你会重新判断？",
    trajectory: { before: start === "action" ? "更接近第一席" : start === "realist" ? "更接近第二席" : "暂时无法判断", during: "把具体问题递到桌面中央", after: hasDepartureReflection ? "留下自己的判断，等待事实验证" : "保留条件，继续观察" },
    discussionMap: {
      question,
      ripples: [
        { label: "健康现金", type: "conflict", sourceSeat: "action" },
        { label: "安全边界", type: "premise", sourceSeat: "realist" },
        { label: state.thirdSeatInvited ? "保留选择" : "仍待验证", type: state.thirdSeatInvited ? "perspective" : "premise", sourceSeat: state.thirdSeatInvited ? "conditional" : undefined },
      ],
      trajectory: { start, checkpoints: ["collision", ...(state.thirdSeatInvited ? ["conditional" as const] : [])], end },
    },
    soulSentence: "你不是在选辞不辞，而是在选哪种代价更能承受。",
    sources: [],
    sourceIds: [],
    sourceUrls: [],
    authors: [],
    mode: "fallback",
  } as SummaryPayload;
}

export default function KnowledgeTable({ topicId = "T01", topicTitle = topic.question }: { topicId?: string; topicTitle?: string }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const requestIds = useRef<Partial<Record<RequestKind, string>>>({});
  const currentTopic = discussionTopic(topicId, topicTitle);
  const loading = selectLoading(state);
  const demoMode = selectDemoMode(state);
  const points = useMemo(() => collisionPointsForTopic(), []);
  const actionSeat = seatById("action");
  const realistSeat = seatById("realist");

  const runRequest = async <T,>(kind: RequestKind, url: string, body: Record<string, unknown>, onSuccess: (result: T) => void, fallback: (requestId: string) => T) => {
    const requestId = makeId(kind);
    requestIds.current[kind] = requestId;
    dispatch({ type: "BEGIN_REQUEST", kind, requestId });
    try {
      const result = await postJSON<T>(url, { sessionId: state.sessionId, requestId, topicId: currentTopic.id, ...body });
      if (requestIds.current[kind] === requestId) {
        // 服务器回显的请求元数据一旦不匹配，不能让 UI 停在 loading 或接收串席结果；
        // 当前请求直接降级到本席位安全兜底。
        onSuccess(responseMatchesRequest(result, requestId, state.sessionId, currentTopic.id) ? result : fallback(requestId));
      }
      return result;
    } catch {
      const fallbackResult = fallback(requestId);
      if (requestIds.current[kind] === requestId) onSuccess(fallbackResult);
      return fallbackResult;
    } finally {
      if (requestIds.current[kind] === requestId) {
        dispatch({ type: "END_REQUEST", kind, requestId });
        delete requestIds.current[kind];
      }
    }
  };

  const chooseTendency = (choice: TendencyChoice) => {
    if (loading) return;
    const firstChoice = choice === "closer_first" ? "support_quit" : choice === "closer_second" ? "oppose_quit" : "depends";
    dispatch({ type: "SET_TENDENCY", choice });
    dispatch({ type: "SET_FIRST_CHOICE", choice: firstChoice });
    dispatch({ type: "SET_STAGE", stage: "collision-point" });
  };

  const chooseCollision = (point: CollisionPoint) => {
    if (loading) return;
    dispatch({ type: "SET_COLLISION_POINT", point });
    dispatch({ type: "SET_STAGE", stage: "collision-drag" });
  };

  const startCollision = () => {
    if (loading || !state.collisionPoint || !state.firstSeatStatement || !state.secondSeatStatement || state.collisionStarted) return;
    dispatch({ type: "SET_COLLISION_STARTED", started: true });
    const point = state.collisionPoint;
    void runRequest<CollisionPayload>(
      "collision",
      "/api/collision",
      {
        tendency: state.tendency,
        selectedSeatId: point.seatId,
        collisionPoint: point.text,
        firstSeatStatement: state.firstSeatStatement,
        secondSeatStatement: state.secondSeatStatement,
        userAddedConditions: state.followups.map((item) => item.question),
      },
      (result) => {
        dispatch({ type: "SET_COLLISION", collision: result });
        dispatch({ type: "SET_STAGE", stage: "collision-response" });
      },
      () => fallbackCollision(point, state.sessionId, makeId("collision-fallback"), currentTopic.id),
    );
  };

  const loadDivergences = () => {
    if (loading || !state.collisionPoint || !state.collision) return;
    void runRequest<{ candidates: DivergenceCandidate[] }>(
      "divergence",
      "/api/divergence",
      {
        tendency: state.tendency,
        selectedSeatId: state.collisionPoint.seatId,
        collisionPoint: state.collisionPoint.text,
        challenge: state.collision.challenge.reply,
        response: state.collision.response.reply,
        userAddedConditions: state.followups.map((item) => item.question),
      },
      (result) => {
        const candidates = result.candidates?.slice(0, 3) ?? [];
        dispatch({ type: "SET_DIVERGENCES", divergences: candidates });
        dispatch({ type: "SET_STAGE", stage: "divergence" });
      },
      () => ({ candidates: [
        { id: "irreversible-loss", title: "哪种损失更难恢复", detail: "一方更担心继续承受累积损失，另一方更担心行动后的资源断裂。", conversationQuoteIds: ["collision-challenge", "collision-response"] },
        { id: "timing-signal", title: "什么信号出现时行动", detail: "双方对方向未必相反，真正不同的是证据、期限和安全线。", conversationQuoteIds: ["collision-question"] },
      ] }),
    );
  };

  const organize = () => dispatch({ type: "SET_STAGE", stage: "exit-understanding" });

  const confirmDivergence = (value: string, selected: DivergenceCandidate[], excludedNames: string[] = []) => {
    const selectedCandidate = selected[0];
    dispatch({ type: "SET_CONFIRMED_DIVERGENCE", value });
    if (!state.collisionPoint || !state.collision) return organize();
    void runRequest<PerspectivePayload>(
      "perspective",
      "/api/perspective",
      {
        selectedSeatId: state.collisionPoint.seatId,
        divergenceId: selectedCandidate?.id ?? "user-confirmed",
        confirmedDivergence: value,
        firstSeatStatement: state.firstSeatStatement,
        secondSeatStatement: state.secondSeatStatement,
        collisionPoint: state.collisionPoint.text,
        challenge: state.collision.challenge.reply,
        response: state.collision.response.reply,
        userAddedConditions: state.followups.map((item) => item.question),
        excludedNames,
      },
      (result) => {
        dispatch({ type: "SET_PERSPECTIVE", perspective: result });
        dispatch({ type: "SET_STAGE", stage: "perspective-preview" });
      },
      () => fallbackPerspective(value, state.sessionId, makeId("perspective-fallback"), currentTopic.id),
    );
  };

  const finishSummary = (understanding?: string) => {
    const value = understanding ?? state.exitUnderstanding;
    if (understanding !== undefined) dispatch({ type: "SET_EXIT_UNDERSTANDING", value });
    const positionChange = state.tendency === "undecided" ? "unchanged" : "slightly_changed";
    dispatch({ type: "SET_POSITION_CHANGE", choice: positionChange });
    // Zod 的 optional 字段不接受显式 null；直接整理时把尚未发生的内容省略，
    // 让服务端能够生成“仅基于已发生内容”的简版结果。
    const payload: Record<string, unknown> = {
      flow: "knowledge-table-v2",
      ...(state.firstSeatStatement ? { firstSeatStatement: state.firstSeatStatement } : {}),
      ...(state.secondSeatStatement ? { secondSeatStatement: state.secondSeatStatement } : {}),
      followups: state.followups,
      ...(state.tendency ? { firstTendency: state.tendency, tendency: state.tendency } : {}),
      ...(state.collision ? { collision: state.collision } : {}),
      ...(state.collisionPoint ? { collisionPoint: state.collisionPoint.text } : {}),
      ...(state.collision?.challenge.reply ? { challenge: state.collision.challenge.reply } : {}),
      ...(state.collision?.response.reply ? { response: state.collision.response.reply } : {}),
      ...(state.confirmedDivergence ? { confirmedDivergence: state.confirmedDivergence } : {}),
      ...(state.thirdSeatInvited && state.perspective?.reply ? { thirdSeatStatement: state.perspective.reply } : {}),
      thirdSeatInvited: state.thirdSeatInvited,
      ...(state.thirdSeatInvited && state.perspective?.name ? { perspectiveName: state.perspective.name } : {}),
      ...(state.thirdSeatInvited && state.perspective?.reframe ? { perspectiveReframe: state.perspective.reframe } : {}),
      exitUnderstanding: value,
      firstChoice: state.firstChoice ?? "depends",
      secondChoice: state.secondChoice ?? "set_deadline",
      positionChange,
      respondedSeatIds: state.collision ? [state.collision.response.seatId] : [],
    };
    void runRequest<SummaryPayload>(
      "summary",
      "/api/summary",
      payload,
      (result) => {
        dispatch({ type: "SET_SUMMARY", summary: { ...result, mode: safeMode(result.mode) } });
        dispatch({ type: "SET_STAGE", stage: "result" });
      },
      () => fallbackSummary({ ...state, exitUnderstanding: value, positionChange }, currentTopic.question),
    );
  };

  const askFollowup = (seatId: SeatId) => {
    if (seatId === "conditional") return;
    if (loading) return;
    dispatch({ type: "OPEN_FOLLOWUP", seatId, anchor: seatId === "realist" ? "second-seat" : "first-seat" });
  };

  const submitFollowup = (question: string) => {
    if (loading || !state.followupSeatId) return;
    const seatId = state.followupSeatId;
    void runRequest<FollowupPayload>(
      "followup",
      "/api/followup",
      { seatId, question, context: { previousFollowups: state.followups, userAddedConditions: state.followups.map((item) => item.question) } },
      (result) => dispatch({ type: "SET_FOLLOWUP_RESULT", result: { ...result, mode: safeMode(result.mode) }, question }),
      (requestId) => fallbackFollowup(seatId, question, {
        sessionId: state.sessionId,
        requestId,
        topicId: currentTopic.id,
      }),
    );
  };

  const reset = () => {
    // Invalidate every in-flight response before resetting. A late response from
    // the previous table must never write into the new session.
    requestIds.current = {};
    dispatch({ type: "RESET" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (state.stage === "home") {
    return <HomeStage topic={currentTopic} onJoin={() => dispatch({ type: "START_SESSION", sessionId: makeId("sess") })} />;
  }
  if (state.stage === "result" && state.summary) {
    return <ResultStage summary={state.summary} onReset={reset} topicId={currentTopic.id} topicTitle={currentTopic.question} />;
  }

  const showAction = ["first-seat", "second-seat", "tendency", "collision-point", "collision-drag", "collision-response", "divergence", "perspective-preview", "third-seat", "exit-understanding"].includes(state.stage);
  const showRealist = ["second-seat", "tendency", "collision-point", "collision-drag", "collision-response", "divergence", "perspective-preview", "third-seat", "exit-understanding"].includes(state.stage);
  const showConditional = state.thirdSeatInvited && Boolean(state.perspective) && ["third-seat", "exit-understanding"].includes(state.stage);
  const activeSeat: SeatId | undefined = state.stage === "first-seat" ? "action" : state.stage === "second-seat" ? "realist" : state.stage === "collision-response" ? state.collision?.response.seatId : state.stage === "third-seat" ? "conditional" : undefined;

  return (
    <main className="discussion-page">
      <header className="topbar">
        <button className="wordmark" type="button" onClick={reset}>知识拼桌</button>
        <ProgressBar stage={state.stage as Stage} />
        {demoMode ? <span className="demo-badge">演示模式</span> : <span />}
      </header>
      <div className="key-setup-topbar">
        <KeySetup />
      </div>
      <HostStrip text={hostText(state.stage, undefined, loading, currentTopic.question)} />
      <section className="table-area" data-testid={`stage-${state.stage}`}>
        <div className="seat-grid">
          {showAction && <SeatCard seat={actionSeat} index={0} active={Boolean(activeSeat)} isSpeaking={activeSeat === "action"} statement={state.firstSeatStatement ?? actionSeat.stance} collision={state.collision} perspective={null} onAsk={!state.followupSeatId && state.stage === "first-seat" ? askFollowup : undefined} />}
          {showRealist && <SeatCard seat={realistSeat} index={1} active={Boolean(activeSeat)} isSpeaking={activeSeat === "realist"} statement={state.secondSeatStatement ?? realistSeat.stance} collision={state.collision} perspective={null} onAsk={!state.followupSeatId && state.stage === "second-seat" ? askFollowup : undefined} />}
          {showConditional && <SeatCard seat={seatById("conditional")} index={2} active={Boolean(activeSeat)} isSpeaking={activeSeat === "conditional"} statement={state.perspective?.reframe ?? seatById("conditional").stance} collision={state.collision} perspective={state.perspective} />}
        </div>
        {state.stage === "intro" ? <IntroStage topic={currentTopic} onProceed={() => dispatch({ type: "SET_STAGE", stage: "first-seat" })} /> : (
          <UserSeat>
            {state.followupSeatId && state.followupAnchor ? (
              <FollowupStage seatId={state.followupSeatId} result={state.followup} loading={loading} onSubmit={submitFollowup} onBack={() => dispatch({ type: "CLOSE_FOLLOWUP" })} />
            ) : (
              <>
                {state.stage === "first-seat" && <SeatStatementStage seat={actionSeat} statement={state.firstSeatStatement ?? actionSeat.stance} onAsk={() => askFollowup("action")} onContinue={() => { dispatch({ type: "SET_SEAT_STATEMENT", seatId: "action", statement: actionSeat.stance }); dispatch({ type: "SET_STAGE", stage: "second-seat" }); }} continueLabel="听第二席 · 现实派" />}
                {state.stage === "second-seat" && <SeatStatementStage seat={realistSeat} statement={state.secondSeatStatement ?? realistSeat.stance} onAsk={() => askFollowup("realist")} onContinue={() => { dispatch({ type: "SET_SEAT_STATEMENT", seatId: "realist", statement: realistSeat.stance }); dispatch({ type: "SET_STAGE", stage: "tendency" }); }} continueLabel="记录此刻倾向" />}
                {state.stage === "tendency" && <ChoiceStage title="听完两个观点，现在的你更接近哪一种判断？" subtitle="这是此刻的起点，不是系统对你的推测。" options={tendencyOptions} loading={loading} onChoose={chooseTendency} />}
                {state.stage === "collision-point" && <CollisionPointStage points={points} loading={loading} onChoose={chooseCollision} />}
                {state.stage === "collision-drag" && state.collisionPoint && <CollisionDragStage point={state.collisionPoint} loading={loading} onDrop={startCollision} onBack={() => dispatch({ type: "SET_STAGE", stage: "collision-point" })} />}
                {state.stage === "collision-response" && state.collision && <><div className="host-summary" data-testid="collision-started"><span>主持人捋了捋</span><p>{state.collision.hostComment}</p></div><button className="primary dark" type="button" disabled={loading} onClick={loadDivergences}>找出隐藏分歧 <span>→</span></button></>}
                {state.stage === "divergence" && <DivergenceStage candidates={state.divergences} loading={loading} onConfirm={confirmDivergence} onReject={organize} onOrganize={organize} />}
                {state.stage === "perspective-preview" && state.perspective && <PerspectivePreviewStage perspective={state.perspective} loading={loading} onInvite={() => { dispatch({ type: "SET_THIRD_SEAT", invited: true }); dispatch({ type: "SET_STAGE", stage: "third-seat" }); }} onChange={() => { if (state.confirmedDivergence) confirmDivergence(state.confirmedDivergence, [], state.perspective ? [state.perspective.name] : []); }} onContinue={organize} onOrganize={organize} />}
                {state.stage === "third-seat" && state.perspective && <><h2>第三席已经入桌</h2><p>它不替你裁决，而是把刚才确认的分歧换成一个可以继续使用的判断框架。</p><div className="host-summary"><span>{state.perspective.name}</span><p>{state.perspective.reply}</p></div><button className="primary dark" type="button" disabled={loading} onClick={() => dispatch({ type: "SET_STAGE", stage: "exit-understanding" })}>留下离桌理解 <span>→</span></button></>}
                {state.stage === "exit-understanding" && <ExitUnderstandingStage initialValue={state.exitUnderstanding} loading={loading} onSubmit={finishSummary} onSkip={() => finishSummary("")} />}
              </>
            )}
          </UserSeat>
        )}
      </section>
      <footer className="mock-note">基于多话题 × 三种视角的真实知乎回答库。每个观点尽可能保留来源边界。</footer>
    </main>
  );
}
