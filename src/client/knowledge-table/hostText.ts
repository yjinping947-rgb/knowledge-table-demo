// src/client/knowledge-table/hostText.ts
// 主持人文案映射。

import type { ResponseWithRound, Stage } from "./state";

export function hostText(stage: Stage, latest?: ResponseWithRound, loading?: boolean, topicTitle = "这个问题"): string {
  if (loading) return "\u201C我在看看，现在最该请谁接话……\u201D";
  if (stage === "intro")
    return `\u201C先别急着选边。A、B 两席先各说两句，C 席先空着，等你聊到关键处再请它进来。\u201D`;
  if (stage === "tendency")
    return "\u201C两边都听到了。哪一边更像你现在的想法？凭直觉选就行。\u201D";
  if (stage === "collision-point")
    return "\u201C你为什么选这句话？哪里最像你的情况，或者最让你疑惑？告诉我就好。\u201D";
  if (stage === "collision-response")
    return "\u201C一次好的质疑，不是把谁说服，而是让真正的分歧露出来。\u201D";
  if (stage === "divergence")
    return "\u201C我可以提出候选，但只有你知道哪一个分歧真正贴近你的担心。\u201D";
  if (stage === "perspective-preview")
    return "\u201C第三席还没有入桌。先看看这个新视角是否值得让它加入讨论。\u201D";
  if (stage === "third-seat")
    return "\u201C现在桌上多了一种看问题的方法。它不替你决定，只帮你保留更多可调整的空间。\u201D";
  if (stage === "result") return "\u201C先不急着下结论。刚才聊清楚的重点，我帮你记下来了。\u201D";
  if (stage.includes("response") && latest) return `\u201C${latest.hostComment}\u201D`;
  return "\u201C先听清楚，再决定要不要行动。\u201D";
}
