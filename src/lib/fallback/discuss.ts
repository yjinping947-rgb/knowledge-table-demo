// src/lib/fallback/discuss.ts
// 两轮讨论的兜底内容。详见 .harness/skills/author-fallback.md。

import type { DiscussResult, FirstChoice, SecondChoice } from "@/lib/types";

const first: Record<FirstChoice, DiscussResult> = {
  support_quit: {
    selectedSeatId: "realist",
    reply: "如果三个月后还没有找到工作，你现在的焦虑会消失，还是变成经济焦虑？",
    hostComment: "你们真正的分歧，是先解除伤害，还是先控制风险。",
    sourceIds: ["S04", "S05"],
    mode: "fallback",
  },
  oppose_quit: {
    selectedSeatId: "action",
    reply: "继续坚持也有成本。失眠和消耗再持续三个月，你还剩多少精力准备下一份工作？",
    hostComment: "留下看似稳定，但健康损失同样是一笔正在发生的成本。",
    sourceIds: ["S01", "S02"],
    mode: "fallback",
  },
  depends: {
    selectedSeatId: "action",
    reply: "如果条件永远凑不齐，'再等等'会不会变成推迟面对伤害的理由？",
    hostComment: "条件判断很重要，也需要一条不再拖延的边界。",
    sourceIds: ["S02", "S03"],
    mode: "fallback",
  },
};

const second: Record<FirstChoice, Record<SecondChoice, DiscussResult>> = {
  support_quit: {
    leave_now: {
      selectedSeatId: "conditional",
      reply: "决定离开之前，能否先写下最低安全线：支出怎么降、何时复盘、什么状态开始求职？",
      hostComment: "你仍把健康放在前面，但主动离开不等于放弃准备。",
      sourceIds: ["S07", "S09"],
      mode: "fallback",
    },
    wait_offer: {
      selectedSeatId: "action",
      reply: "你增加了经济条件，但失眠仍在继续。你准备给'找到下家'设多长的健康止损期限？",
      hostComment: "你的立场在调整：安全感重要，继续消耗也不能没有上限。",
      sourceIds: ["S01", "S02"],
      mode: "fallback",
    },
    set_deadline: {
      selectedSeatId: "conditional",
      reply: "折中方案需要可执行：请假多久、期限多长、出现什么信号就正式离开？",
      hostComment: "折中不是模糊等待，而是把判断条件变得具体。",
      sourceIds: ["S08", "S09"],
      mode: "fallback",
    },
  },
  oppose_quit: {
    leave_now: {
      selectedSeatId: "realist",
      reply: "你开始把健康放到更前面。离开前，三个月生活费里哪些支出可以缩减，下一步由什么触发？",
      hostComment: "你改变了行动选择，但仍可以带着现实准备离开。",
      sourceIds: ["S04", "S06"],
      mode: "fallback",
    },
    wait_offer: {
      selectedSeatId: "conditional",
      reply: "如果继续等待，你能承受的期限是什么？合同到期和失眠加重，哪一个会触发离开？",
      hostComment: "坚持原立场也需要边界，否则'等下家'可能没有终点。",
      sourceIds: ["S07", "S09"],
      mode: "fallback",
    },
    set_deadline: {
      selectedSeatId: "conditional",
      reply: "这个折中依赖两个条件：公司允许降低投入，以及你真的会在期限到达时行动。",
      hostComment: "你没有放弃安全感，而是为健康增加了一条退出机制。",
      sourceIds: ["S08", "S09"],
      mode: "fallback",
    },
  },
  depends: {
    leave_now: {
      selectedSeatId: "realist",
      reply: "失眠让你跨过了健康边界，但三个月储蓄仍很短。离开前最需要锁定哪项基本保障？",
      hostComment: "具体情境让你的条件排序变清楚了：健康优先，风险仍需管理。",
      sourceIds: ["S04", "S06"],
      mode: "fallback",
    },
    wait_offer: {
      selectedSeatId: "action",
      reply: "你把收入连续性放在前面，但连续失眠是否已经说明，等待本身也在削弱你的求职能力？",
      hostComment: "你的判断强调经济安全，行动派提醒你别把留下当成没有代价。",
      sourceIds: ["S01", "S02"],
      mode: "fallback",
    },
    set_deadline: {
      selectedSeatId: "conditional",
      reply: "请把'设定期限'变成标准：到合同结束、失眠加重，还是储蓄达到某个边界时离开？",
      hostComment: "你选择了中间道路，关键是让条件可观察、期限可执行。",
      sourceIds: ["S08", "S09"],
      mode: "fallback",
    },
  },
};

export function getDiscussFallback(
  round: 1 | 2,
  firstChoice: FirstChoice,
  secondChoice?: SecondChoice | null,
): DiscussResult {
  return round === 1 ? first[firstChoice] : second[firstChoice][secondChoice!];
}
