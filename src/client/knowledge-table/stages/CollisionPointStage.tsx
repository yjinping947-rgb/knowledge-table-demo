import type { CollisionPoint, SeatId } from "@/lib/types";

export function CollisionPointStage({
  points,
  loading,
  onChoose,
  seatLabels,
}: {
  points: CollisionPoint[];
  loading: boolean;
  onChoose: (point: CollisionPoint) => void;
  seatLabels: Record<SeatId, string>;
}) {
  return (
    <>
      <h2>选一个具体论点，请另一席回应</h2>
      <p>碰撞由你发起。选最让你停顿的一句话，也可以先举手追问。</p>
      <div className="choices collision-choices">
        {points.map((point, index) => (
          <button disabled={loading} key={point.id} onClick={() => onChoose(point)}>
            <b>{String.fromCharCode(65 + index)}</b>
            <span>
              <small>{point.seatId === "action" ? `第一席 · ${seatLabels.action}` : `第二席 · ${seatLabels.realist}`}</small>
              {point.text}
            </span>
            <em>→</em>
          </button>
        ))}
      </div>
      {loading && <p className="loading" role="status">两席正在准备一次质疑与回应……</p>}
    </>
  );
}
