// src/client/knowledge-table/constants.ts
// 三个阶段的选项配置。

import { seats } from "@/data";
import type { CollisionPoint, FirstChoice, PositionChange, SecondChoice, TendencyChoice } from "@/lib/types";

export const tendencyOptions: { id: TendencyChoice; label: string; short: string }[] = [
  { id: "closer_first", label: "我更在意先解决眼前的问题", short: "先解决问题" },
  { id: "closer_second", label: "我更在意先把风险和成本算清楚", short: "先看风险" },
  { id: "both_valid", label: "两边都有道理，要看具体情况", short: "看具体条件" },
  { id: "undecided", label: "我还没想清楚", short: "还没想清楚" },
  { id: "missed_point", label: "两边都没说到我的重点", short: "没说到重点" },
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

export function collisionPointsForTopic(topicId = "T01", topicTitle = "这个问题", tendency?: TendencyChoice | null): CollisionPoint[] {
  if (topicId === "T01") {
    return seats
      .filter((seat) => seat.id === "action" || seat.id === "realist")
      .flatMap((seat) => seat.arguments.map((text, index) => ({ id: `${seat.id}-${index + 1}`, seatId: seat.id, text })));
  }
  const points = [
    { id: "action-1", seatId: "action" as const, text: `面对「${topicTitle}」，先做一个小改变，会不会比继续观望更快看清结果？` },
    { id: "realist-1", seatId: "realist" as const, text: `如果现在就改变「${topicTitle}」，时间、精力和钱的代价由谁来承担？` },
    { id: "action-2", seatId: "action" as const, text: `关于「${topicTitle}」，什么迹象出现时就不能再拖了？` },
    { id: "realist-2", seatId: "realist" as const, text: `关于「${topicTitle}」，先保住什么底线，才能让后面的选择不被迫进行？` },
  ];
  if (tendency === "closer_second") return [points[1], points[3], points[0], points[2]];
  if (tendency === "missed_point") return [points[2], points[3], points[0], points[1]];
  return points;
}
