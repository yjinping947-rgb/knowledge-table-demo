// src/client/knowledge-table/hostText.ts
// 主持人文案映射。

import type { ResponseWithRound, Stage } from "./state";

export function hostText(stage: Stage, latest?: ResponseWithRound, loading?: boolean, topicTitle = "这个问题"): string {
  if (loading) return "\u201C我在看看，现在最该请谁接话……\u201D";
  if (stage === "intro") return "\u201C先听第一席和第二席。第三席只有在碰撞后确认隐藏分歧时，才可能入桌。\u201D";
  if (stage === "first-seat") return `\u201C先听行动派把判断说完整：它保护什么，也承认什么边界？话题是「${topicTitle}」。\u201D`;
  if (stage === "second-seat") return `\u201C现在换现实派。听听它如何计算现金流、责任和替代方案，再回到「${topicTitle}」的具体条件。\u201D`;
  if (stage === "tendency")
    return "\u201C两席都说完了。先留下你此刻更靠近哪一边的感觉，它会成为这张桌子的起点。\u201D";
  if (stage === "collision-point")
    return "\u201C别替他们总结，直接挑一句让你停顿的话。碰撞由你发起。\u201D";
  if (stage === "collision-drag") return "\u201C选中只是决定碰什么。把这句话递到两席中央，才会真正开始。\u201D";
  if (stage === "collision-response")
    return "\u201C一次好的质疑，不是把谁说服，而是让真正的分歧露出来。\u201D";
  if (stage === "divergence")
    return "\u201C我可以提出候选，但只有你知道哪一个分歧真正贴近你的担心。\u201D";
  if (stage === "perspective-preview")
    return "\u201C第三席还没有入桌。先看看这个新视角是否值得让它加入讨论。\u201D";
  if (stage === "third-seat")
    return "\u201C现在桌上多了一种看问题的方法。它不替你决定，只帮你保留更多可调整的空间。\u201D";
  if (stage === "result") return "\u201C这张桌子不急着给结论，先把你已经看清的东西留下来。\u201D";
  if (stage === "exit-understanding") return "\u201C离桌前留下一句你的理解，也可以跳过。\u201D";
  if (stage.includes("response") && latest) return `\u201C${latest.hostComment}\u201D`;
  return "\u201C先听清楚，再决定要不要行动。\u201D";
}
