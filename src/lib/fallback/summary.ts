// src/lib/fallback/summary.ts
// 总结的兜底内容。详见 .harness/skills/author-fallback.md。

import type { FirstChoice, PositionChange, SecondChoice, SummaryResult } from "@/lib/types";

const labels = {
  first: {
    support_quit: "倾向立即裸辞",
    oppose_quit: "倾向先找到下家",
    depends: "倾向根据条件判断",
  },
  second: {
    leave_now: "在具体压力下选择先离开",
    wait_offer: "在具体压力下仍选择等到下家",
    set_deadline: "选择降低投入并设离职期限",
  },
  change: {
    unchanged: "核心立场保持不变",
    slightly_changed: "保留原方向并补充了条件",
    changed: "主要判断发生了变化",
  },
} as const;

export function getSummaryFallback(
  firstChoice: FirstChoice,
  secondChoice: SecondChoice,
  positionChange: PositionChange,
): SummaryResult {
  const immediate = secondChoice === "leave_now";
  const waiting = secondChoice === "wait_offer";
  return {
    consensus: "长期有害的工作状态不应被无限忍耐，离开或留下都需要面对真实成本。",
    disagreement: immediate
      ? "应该先解除身心伤害，还是先为收入中断建立安全垫？"
      : waiting
        ? "经济安全能否优先于持续发生的健康损失？"
        : "折中方案是在主动争取空间，还是在推迟必须作出的选择？",
    hiddenAssumption: immediate
      ? "你的选择可能默认三个月足以恢复并启动下一步，但求职周期仍不确定。"
      : waiting
        ? "你的选择可能默认自己能继续承受当前状态，且等待不会削弱求职能力。"
        : "折中方案可能默认公司允许请假或降低投入，也默认期限到达时你会行动。",
    trajectory: {
      before: labels.first[firstChoice],
      during: labels.second[secondChoice],
      after: labels.change[positionChange],
    },
    openQuestion: "现在的痛苦主要来自这份具体工作，还是来自尚未解决的职业方向？",
    mode: "fallback",
  };
}
