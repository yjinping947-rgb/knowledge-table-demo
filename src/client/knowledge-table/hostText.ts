// src/client/knowledge-table/hostText.ts
// 主持人文案映射。

import type { ResponseWithRound, Stage } from "./state";

export function hostText(stage: Stage, latest?: ResponseWithRound, loading?: boolean): string {
  if (loading) return "\u201C我在看看，现在最该请谁接话……\u201D";
  if (stage === "intro")
    return "\u201C我找到了三种看起来都有道理的答案。它们真正争论的，也许不只是要不要辞职。先听听他们怎么说？\u201D";
  if (stage === "round1-choice")
    return "\u201C有人在说健康和意义，有人在说收入和风险。先别急着找标准答案。\u201D";
  if (stage.includes("response") && latest) return `\u201C${latest.hostComment}\u201D`;
  if (stage === "round2-choice")
    return "\u201C抽象的态度容易说，放进具体生活里，选择可能会变。\u201D";
  return "\u201C两轮下来，你的想法有变化吗？调整判断不代表前面选错了。\u201D";
}
