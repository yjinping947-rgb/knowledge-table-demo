// src/client/knowledge-table/components/SeatCard.tsx

import type { CollisionResult, DiscussResult, PerspectiveResult, SeatId } from "@/lib/types";
import type { Seat } from "@/data";

export function SeatCard({
  seat,
  index,
  active,
  isSpeaking,
  latest,
  stance,
  collision,
  perspective,
  frameworkReply,
  onAsk,
}: {
  seat: Seat;
  index: number;
  active: boolean;
  isSpeaking: boolean;
  latest?: DiscussResult;
  stance?: string;
  collision?: CollisionResult | null;
  perspective?: PerspectiveResult | null;
  frameworkReply?: string;
  onAsk?: (seatId: SeatId) => void;
}) {
  const displayName = perspective?.name ?? seat.name;
  const displayStance = perspective?.reframe ?? stance ?? seat.stance;
  const turn = collision?.challenge.seatId === seat.id
    ? { label: "提出质疑", ...collision.challenge }
    : collision?.response.seatId === seat.id
      ? { label: "完成回应", ...collision.response }
      : null;
  const displaySourceIds = perspective?.sourceIds ?? seat.sourceIds;

  return (
    <article
      className={`seat-card ${seat.color} ${isSpeaking ? "speaking" : active ? "muted" : ""}`}
      style={{ animationDelay: `${index * 110}ms` }}
    >
      <div className="seat-head">
        <span className="seat-mark">{seat.mark}</span>
        <div>
          <small>观点席位</small>
          <h2>{displayName}</h2>
        </div>
        {isSpeaking && <span className="speaking-label">正在发言</span>}
      </div>
      <p className="stance">&ldquo;{displayStance}&rdquo;</p>
      {isSpeaking && latest && (
        <div className="reply">
          <span>回应你的选择</span>
          <p>{latest.reply}</p>
          {latest.sourceUrls && latest.sourceUrls[0] && (
            <a
              className="reply-source"
              href={latest.sourceUrls[0]}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 8,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ink)",
                textDecoration: "underline",
              }}
            >
              查看原文（{latest.authors?.[0] ?? "知乎答主"}）↗
            </a>
          )}
        </div>
      )}
      {turn && (
        <div className="reply">
          <span>{turn.label}</span>
          <p>{turn.reply}</p>
          {turn.sourceUrls?.[0] && <a className="reply-source" href={turn.sourceUrls[0]} rel="noreferrer" target="_blank">查看原文（{turn.authors?.[0] ?? "知乎答主"}）↗</a>}
        </div>
      )}
      {frameworkReply && (
        <div className="framework-reply">
          <b>回应新视角</b>
          {frameworkReply}
        </div>
      )}
      <div className="source-chips">
        {displaySourceIds.map((id) => (
          <span key={id}>{id}</span>
        ))}
      </div>
      {onAsk && <button className="ask-button" onClick={() => onAsk(seat.id)}>举手追问这席 ↗</button>}
    </article>
  );
}
