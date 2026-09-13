import { useState } from "react";
import type { FollowupResult, SeatId } from "@/lib/types";

export function FollowupStage({
  seatId,
  result,
  loading,
  onSubmit,
  onBack,
}: {
  seatId: SeatId;
  result: FollowupResult | null;
  loading: boolean;
  onSubmit: (question: string) => void;
  onBack: () => void;
}) {
  const [question, setQuestion] = useState("");
  const seatName = seatId === "action" ? "第一席 · 行动派" : "第二席 · 现实派";

  return (
    <>
      <h2>举手追问 {seatName}</h2>
      {!result ? (
        <>
          <p>把你的真实条件放进来，问完仍会回到刚才的主流程。</p>
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
        </>
      ) : (
        <>
          <div className="host-summary"><span>{seatName}回应</span><p>{result.reply}</p></div>
          {result.sourceUrls?.[0] && <a className="reply-source" href={result.sourceUrls[0]} rel="noreferrer" target="_blank">查看相关知乎原文 ↗</a>}
          <button className="primary dark" onClick={onBack}>回到主流程 <span>→</span></button>
        </>
      )}
      {loading && <p className="loading" role="status">我在帮你把这个条件放回席位的判断里……</p>}
    </>
  );
}
