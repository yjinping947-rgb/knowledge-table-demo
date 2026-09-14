// src/client/knowledge-table/constants.ts
// 三个阶段的选项配置。

import { seats } from "@/data";
import type { CollisionPoint, FirstChoice, PositionChange, SecondChoice, TendencyChoice } from "@/lib/types";

export const tendencyOptions: { id: TendencyChoice; label: string; short: string }[] = [
  { id: "closer_first", label: "我更接近第一席的判断", short: "更接近第一席" },
  { id: "closer_second", label: "我更接近第二席的判断", short: "更接近第二席" },
  { id: "undecided", label: "暂时无法判断", short: "暂时无法判断" },
];

export const firstOptions: { id: FirstChoice; label: string; short: string }[] = [
  { id: "support_quit", label: "工作已经严重影响身心，就应该裸辞", short: "支持裸辞" },
  { id: "oppose_quit", label: "应该先找到下一份工作，不能冲动离开", short: "反对裸辞" },
  { id: "depends", label: "要看储蓄、行业和个人情况", short: "视情况而定" },
];

export const secondOptions: { id: SecondChoice; label: string }[] = [
  { id: "leave_now", label: "立即离开，先恢复状态" },
  { id: "wait_offer", label: "坚持到找到下一份工作" },
  { id: "set_deadline", label: "先请假或降低投入，同时设定离职期限" },
];

export const reflectionOptions: { id: PositionChange; label: string }[] = [
  { id: "unchanged", label: "没有变化" },
  { id: "slightly_changed", label: "调整了一些条件" },
  { id: "changed", label: "改变了主要立场" },
];

const generalFirstOptions: { id: FirstChoice; label: string; short: string }[] = [
  { id: "support_quit", label: "更倾向于主动行动，先解决眼前的问题", short: "主动行动" },
  { id: "oppose_quit", label: "更倾向于保持现状，先降低变化风险", short: "降低风险" },
  { id: "depends", label: "要看具体条件，再决定下一步", short: "看具体条件" },
];

const generalSecondOptions: { id: SecondChoice; label: string }[] = [
  { id: "leave_now", label: "现在就行动，优先解决主要矛盾" },
  { id: "wait_offer", label: "先观察并准备，等更明确信号" },
  { id: "set_deadline", label: "设置边界和期限，采取折中方案" },
];

export function firstOptionsForTopic(topicId: string) {
  return topicId === "T01" ? firstOptions : generalFirstOptions;
}

export function secondOptionsForTopic(topicId: string) {
  return topicId === "T01" ? secondOptions : generalSecondOptions;
}

export function collisionPointsForTopic(): CollisionPoint[] {
  // 碰撞候选必须是可验证的完整问题，而不是“健康/经济”等抽象标签。
  const verified = [
    { id: "buffer-runway", seatId: "realist" as const, text: "三个月存款够不够支撑裸辞？" },
    { id: "staying-risk", seatId: "action" as const, text: "继续留下本身是不是一种风险？" },
    { id: "irreversible-loss", seatId: "action" as const, text: "哪种损失更难恢复？" },
  ];
  return verified.length
    ? verified
    : seats
    .filter((seat) => seat.id === "action" || seat.id === "realist")
    .flatMap((seat) =>
      seat.arguments.map((text, index) => ({
        id: `${seat.id}-${index + 1}`,
        seatId: seat.id,
        text,
      })),
    );
}
