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
  introReply,
  introSourceIds,
  onAsk,
  likedQuotes = [],
  onLike,
  revealed = true,
  placeholder = false,
  seatLabel,
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
  introReply?: string;
  introSourceIds?: string[];
  onAsk?: (seatId: SeatId) => void;
  likedQuotes?: string[];
  onLike?: (quote: string) => void;
  revealed?: boolean;
  placeholder?: boolean;
  seatLabel?: string;
}) {
  if (placeholder) {
    return (
      <article className={`seat-card ${seat.color}`}>
        <div className="seat-head">
          <span className="seat-mark">?</span>
          <div><small>观点席位</small><h2>待生成的新视角</h2></div>
        </div>
        <p className="stance">这里先留一把空椅子。等你参与讨论、说出自己的困惑后，再邀请一个新的观点入局。</p>
      </article>
    );
  }
  const displayName = perspective?.name ?? seatLabel ?? seat.name;
  const displayStance = perspective?.reframe ?? stance ?? seat.stance;
  const turn = collision?.challenge.seatId === seat.id
    ? { label: "提出质疑", ...collision.challenge }
    : collision?.response.seatId === seat.id
      ? { label: "完成回应", ...collision.response }
      : null;
  const displaySourceIds = perspective?.sourceIds ?? introSourceIds ?? seat.sourceIds;

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
      {revealed ? <p className="stance">&ldquo;{introReply ?? displayStance}&rdquo;</p> : <p className="stance">这一席还没发言，点击下方按钮开始倾听。</p>}
      {isSpeaking && introReply && onLike && (
        <button className="ask-button" onClick={() => onLike(introReply)}>{likedQuotes.includes(introReply) ? "已收录 ★" : "点赞收录 ☆"}</button>
      )}
      {isSpeaking && latest && (
        <div className="reply">
          <span>{latest.reply === introReply ? "依据来自知乎" : "回应你的选择"}</span>
          <small className="mode-line">{latest.sourceStatus === "zhihu-realtime" ? "知乎实时来源" : latest.sourceStatus === "hybrid" ? "知乎实时 + 本地补充" : latest.sourceStatus === "local-fallback" ? "本地语料降级" : "暂无匹配来源"}</small>
          {latest.reply !== introReply && <>
            <p>{latest.reply}</p>
            {onLike && <button className="ask-button" onClick={() => onLike(latest.reply)}>{likedQuotes.includes(latest.reply) ? "已收录 ★" : "点赞收录 ☆"}</button>}
          </>}
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
          <small className="mode-line">{turn.sourceStatus === "zhihu-realtime" ? "知乎实时来源" : turn.sourceStatus === "hybrid" ? "知乎实时 + 本地补充" : turn.sourceStatus === "local-fallback" ? "本地语料降级" : "暂无匹配来源"}</small>
          <p>{turn.reply}</p>
          {onLike && <button className="ask-button" onClick={() => onLike(turn.reply)}>{likedQuotes.includes(turn.reply) ? "已收录 ★" : "点赞收录 ☆"}</button>}
          {turn.sourceUrls?.[0] && <a className="reply-source" href={turn.sourceUrls[0]} rel="noreferrer" target="_blank">查看原文（{turn.authors?.[0] ?? "知乎答主"}）↗</a>}
        </div>
      )}
      {frameworkReply && (
        <div className="framework-reply">
          <b>回应新视角</b>
          {frameworkReply}
        </div>
      )}
      {perspective?.reply && (
        <div className="reply">
          <span>第三席观点</span>
          <p>{perspective.reply}</p>
          {onLike && <button className="ask-button" onClick={() => onLike(perspective.reply)}>{likedQuotes.includes(perspective.reply) ? "已收录 ★" : "点赞收录 ☆"}</button>}
        </div>
      )}
      {revealed && <div className="source-chips">
        {displaySourceIds.map((id) => (
          <span key={id}>{id}</span>
        ))}
      </div>}
      {onAsk && revealed && <button type="button" className="primary dark" style={{ marginTop: 18, minHeight: 44, padding: "0 14px", fontSize: 13 }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onAsk(seat.id); }}>✋ 举手追问这席（可以随时问） ↗</button>}
    </article>
  );
}
