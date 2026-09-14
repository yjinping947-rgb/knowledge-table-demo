import type { Seat } from "@/data";

export function SeatStatementStage({
  seat,
  statement,
  onContinue,
  onAsk,
  continueLabel,
}: {
  seat: Seat;
  statement: string;
  onContinue: () => void;
  onAsk: () => void;
  continueLabel: string;
}) {
  return (
    <>
      <p className="eyebrow">现在听这一席的完整判断</p>
      <h2>{seat.name}：先把这件事说完整</h2>
      <div className="host-summary" data-testid={`statement-${seat.id}`}>
        <span>核心判断</span>
        <p>{statement}</p>
      </div>
      <div className="choices collision-choices">
        <div>
          <small>主要理由</small>
          <p>{seat.arguments[0]}</p>
        </div>
        <div>
          <small>适用边界</small>
          <p>{seat.arguments[1]}；如果条件不满足，需要先补足安全线。</p>
        </div>
      </div>
      <div className="secondary-actions">
        <button type="button" onClick={onAsk}>举手追问这席 ↗</button>
        <button className="primary dark" type="button" onClick={onContinue}>
          {continueLabel} <span>→</span>
        </button>
      </div>
    </>
  );
}
