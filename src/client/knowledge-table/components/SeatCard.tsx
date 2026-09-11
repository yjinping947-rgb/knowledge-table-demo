// src/client/knowledge-table/components/SeatCard.tsx

import type { DiscussResult } from "@/lib/types";
import type { Seat } from "@/data";

export function SeatCard({
  seat,
  index,
  active,
  isSpeaking,
  latest,
}: {
  seat: Seat;
  index: number;
  active: boolean;
  isSpeaking: boolean;
  latest?: DiscussResult;
}) {
  return (
    <article
      className={`seat-card ${seat.color} ${isSpeaking ? "speaking" : active ? "muted" : ""}`}
      style={{ animationDelay: `${index * 110}ms` }}
    >
      <div className="seat-head">
        <span className="seat-mark">{seat.mark}</span>
        <div>
          <small>观点席位</small>
          <h2>{seat.name}</h2>
        </div>
        {isSpeaking && <span className="speaking-label">正在发言</span>}
      </div>
      <p className="stance">&ldquo;{seat.stance}&rdquo;</p>
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
      <div className="source-chips">
        {seat.sourceIds.map((id) => (
          <span key={id}>{id}</span>
        ))}
      </div>
    </article>
  );
}
