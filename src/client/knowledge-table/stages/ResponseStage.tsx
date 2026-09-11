// src/client/knowledge-table/stages/ResponseStage.tsx
// 两轮选择后的"回应"展示。复用：第一轮回应 / 第二轮回应。

import type { DiscussResult } from "@/lib/types";

export function ResponseStage({
  result,
  button,
  onProceed,
}: {
  result: DiscussResult;
  button: string;
  onProceed: () => void;
}) {
  return (
    <>
      <div className="host-summary">
        <span>主持人捋了捋</span>
        <p>{result.hostComment}</p>
      </div>
      <button className="primary dark" onClick={onProceed}>
        {button} <span>→</span>
      </button>
    </>
  );
}
