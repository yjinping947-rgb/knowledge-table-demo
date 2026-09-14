import { useRef, useState } from "react";
import type { CollisionPoint } from "@/lib/types";

/**
 * 把“选中碰撞点”和“开始碰撞”拆成两个动作，避免点击候选时误触发 API。
 * Pointer Events 同时覆盖鼠标、触摸和手写笔；键盘按钮是无障碍等价路径。
 */
export function CollisionDragStage({
  point,
  loading,
  onDrop,
  onBack,
}: {
  point: CollisionPoint;
  loading: boolean;
  onDrop: () => void;
  onBack: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [overDropzone, setOverDropzone] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const finishPointerDrop = (event: React.PointerEvent<HTMLButtonElement>) => {
    const target = dropzoneRef.current;
    const rect = target?.getBoundingClientRect();
    const inside = Boolean(rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
    setDragging(false);
    setOverDropzone(false);
    if (inside && !loading) onDrop();
  };

  return (
    <>
      <h2>把这句话递到桌子中央</h2>
      <p>点击只是选中问题；拖到两席之间，才会开始一次真实碰撞。</p>
      <div className="collision-choices" style={{ margin: "24px auto", maxWidth: 560 }}>
        <button
          type="button"
          data-testid="collision-point-card"
          aria-label={`拖动碰撞点：${point.text}`}
          disabled={loading}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (!dragging) return;
            const rect = dropzoneRef.current?.getBoundingClientRect();
            setOverDropzone(Boolean(rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom));
          }}
          onPointerUp={finishPointerDrop}
          onPointerCancel={() => {
            setDragging(false);
            setOverDropzone(false);
          }}
          style={{
            minHeight: 92,
            width: "100%",
            touchAction: "none",
            cursor: dragging ? "grabbing" : "grab",
            opacity: dragging ? 0.75 : 1,
          }}
        >
          <b>碰</b>
          <span><small>已选择 · {point.seatId === "action" ? "第一席" : "第二席"}</small>{point.text}</span>
          <em>↔</em>
        </button>
      </div>
      <div
        ref={dropzoneRef}
        data-testid="collision-dropzone"
        aria-label="两席之间的碰撞区"
        style={{
          border: "2px dashed",
          minHeight: 90,
          display: "grid",
          placeItems: "center",
          padding: 18,
          background: overDropzone ? "#fff5cf" : "transparent",
          transition: "background .15s ease",
        }}
      >
        {overDropzone ? "松手，开始碰撞" : "把碰撞点放在这里"}
      </div>
      <div className="secondary-actions">
        <button type="button" disabled={loading} onClick={onBack}>换一个碰撞点</button>
        <button
          type="button"
          className="primary dark"
          data-testid="collision-start-keyboard"
          disabled={loading}
          onClick={onDrop}
        >
          递到桌面中央 <span>→</span>
        </button>
      </div>
    </>
  );
}
