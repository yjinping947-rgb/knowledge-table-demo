// src/client/knowledge-table/constants.ts
// 三个阶段的选项配置。

import type { FirstChoice, PositionChange, SecondChoice } from "@/lib/types";

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
