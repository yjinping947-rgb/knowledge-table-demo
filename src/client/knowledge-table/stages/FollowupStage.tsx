import { useState } from "react";
import type { FollowupResult, FollowupTurn, SeatId } from "@/lib/types";

export function FollowupStage({
  seatId,
  result,
  history,
  loading,
  onSubmit,
  onContinue,
  onBack,
  likedQuotes,
  onLike,
  backLabel,
  seatLabels,
}: {
  seatId: SeatId;
  result: FollowupResult | null;
  history: FollowupTurn[];
  loading: boolean;
  onSubmit: (question: string) => void;
  onContinue: () => void;
  onBack: () => void;
  likedQuotes: string[];
  onLike: (quote: string) => void;
  backLabel: string;
  seatLabels: Record<SeatId, string>;
}) {
  const [question, setQuestion] = useState("");
  const seatName = seatId === "action" ? `第一席 · ${seatLabels.action}` : `第二席 · ${seatLabels.realist}`;

  return (
    <>
      <h2>举手追问 {seatName}</h2>
      {!result ? (
        <>
          <p>{history.length ? `你已和${seatName}交流 ${history.length} 次，可以继续追问；结束后再回到主流程。` : "把你的真实条件放进来，可以连续追问这一席。"}</p>
          {history.map((turn, index) => (
            <div className="host-summary" key={`${turn.question}-${index}`}>
              <span>你：{turn.question}</span>
              <p>{turn.result.reply}</p>
              <button className="ask-button" onClick={() => onLike(turn.result.reply)}>{likedQuotes.includes(turn.result.reply) ? "已收录 ★" : "点赞收录 ☆"}</button>
            </div>
          ))}
          <label className="text-field">
            <span>你的问题</span>
            <textarea
              autoFocus
              disabled={loading}
              maxLength={300}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="如果我的情况是……你还会这样判断吗？"
              value={question}
            />
          </label>
          <button className="primary dark" disabled={loading || question.trim().length < 2} onClick={() => onSubmit(question.trim())}>
            请这席回应 <span>→</span>
          </button>
          <div className="secondary-actions">
            <button disabled={loading} onClick={() => { setQuestion(""); onBack(); }}>{backLabel}</button>
          </div>
        </>
      ) : (
        <>
          <div className="host-summary"><span>{seatName}回应</span><small className="mode-line">{result.sourceStatus === "zhihu-realtime" ? "知乎实时来源" : result.sourceStatus === "hybrid" ? "知乎实时 + 本地补充" : result.sourceStatus === "local-fallback" ? "本地语料降级" : "暂无匹配来源"}</small><p>{result.reply}</p><button className="ask-button" onClick={() => onLike(result.reply)}>{likedQuotes.includes(result.reply) ? "已收录 ★" : "点赞收录 ☆"}</button></div>
          {result.sourceUrls?.[0] && <a className="reply-source" href={result.sourceUrls[0]} rel="noreferrer" target="_blank">查看相关知乎原文 ↗</a>}
          <button className="primary dark" onClick={() => { setQuestion(""); onContinue(); }} disabled={loading}>继续追问 <span>↗</span></button>
          <button className="primary dark" onClick={onBack}>结束单独交流 <span>→</span></button>
        </>
      )}
      {loading && <p className="loading" role="status">我在帮你把这个条件放回席位的判断里……</p>}
    </>
  );
}
