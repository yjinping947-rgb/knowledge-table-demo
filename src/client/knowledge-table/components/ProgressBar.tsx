// src/client/knowledge-table/components/ProgressBar.tsx

import type { Stage } from "../state";

export function ProgressBar({ stage }: { stage: Stage }) {
  return (
    <div className="progress" aria-label="讨论进度">
      <span className={stage === "intro" ? "on" : "done"}>入桌</span>
      <i />
      <span
        className={
          ["round1-choice", "round1-response"].includes(stage)
            ? "on"
            : ["round2-choice", "round2-response", "reflection"].includes(stage)
              ? "done"
              : ""
        }
      >
        第一轮
      </span>
      <i />
      <span
        className={
          ["round2-choice", "round2-response"].includes(stage)
            ? "on"
            : ["reflection"].includes(stage)
              ? "done"
              : ""
        }
      >
        第二轮
      </span>
      <i />
      <span className={stage === "reflection" ? "on" : ""}>整理</span>
    </div>
  );
}
