import { useState } from "react";
import type { CollisionPoint } from "@/lib/types";

export function CollisionPointStage({
  points,
  loading,
  onChoose,
}: {
  points: CollisionPoint[];
  loading: boolean;
  onChoose: (point: CollisionPoint) => void;
}) {
  const [custom, setCustom] = useState("");
  return (
    <>
      <h2>选一个具体问题，让两席碰一次</h2>
      <p>先决定“碰什么”。下一步还要把它递到两席中央，才会开始质疑与回应。</p>
      <div className="choices collision-choices" data-testid="collision-point-list">
        {points.slice(0, 3).map((point, index) => (
          <button disabled={loading} key={point.id} type="button" onClick={() => onChoose(point)}>
            <b>{String.fromCharCode(65 + index)}</b>
            <span>
              <small>{point.seatId === "action" ? "第一席 · 行动派" : "第二席 · 现实派"}</small>
              {point.text}
            </span>
            <em>→</em>
          </button>
        ))}
      </div>
      <label className="text-field">
        <span>也可以写下你自己的碰撞问题</span>
        <textarea
          disabled={loading}
          maxLength={120}
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="例如：如果需要照护家人，行动时机要不要改变？"
        />
      </label>
      <button
        className="primary dark"
        type="button"
        disabled={loading || custom.trim().length < 4}
        onClick={() => onChoose({ id: "custom", seatId: "action", text: custom.trim() })}
      >
        使用我的问题 <span>→</span>
      </button>
    </>
  );
}
