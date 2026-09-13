// src/client/knowledge-table/components/ProgressBar.tsx

import { Fragment } from "react";
import type { Stage } from "../state";

export function ProgressBar({ stage }: { stage: Stage }) {
  const firstGroup: Stage[] = ["intro"];
  const secondGroup: Stage[] = ["tendency"];
  const thirdGroup: Stage[] = ["collision-point", "collision-response"];
  const fourthGroup: Stage[] = ["divergence", "perspective-preview"];
  const fifthGroup: Stage[] = ["third-seat", "result"];
  const groups = [firstGroup, secondGroup, thirdGroup, fourthGroup, fifthGroup];
  const activeIndex = groups.findIndex((group) => group.includes(stage));

  return (
    <div className="progress" aria-label="讨论进度">
      {["入桌", "两席", "碰撞", "校准", "第三席"].map((label, index) => (
        <Fragment key={label}>
          <span className={index === activeIndex ? "on" : index < activeIndex ? "done" : ""}>{label}</span>
          {index < groups.length - 1 && <i />}
        </Fragment>
      ))}
    </div>
  );
}
