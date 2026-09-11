// src/agents/director/router.ts
// 路由规则表。详见 .harness/agents/director.md "路由规则" 节。

import type { FirstChoice, SecondChoice, SeatId } from "@/lib/types";

/**
 * 第一轮（3 选 1）：按用户 firstChoice 决定优先碰撞对象。
 */
export function firstRoundTarget(firstChoice: FirstChoice): SeatId {
  switch (firstChoice) {
    case "support_quit":
      return "realist"; // 经济边界
    case "oppose_quit":
      return "action"; // 健康成本
    case "depends":
      return "action"; // 条件不齐时的拖延
  }
}

/**
 * 第二轮（9 选 1）：按 firstChoice × secondChoice 决定。
 */
const secondRoundTable: Record<FirstChoice, Record<SecondChoice, SeatId>> = {
  support_quit: {
    leave_now: "conditional", // 提醒最低安全线
    wait_offer: "action", // 拉回健康风险
    set_deadline: "conditional", // 强化条件化路径
  },
  oppose_quit: {
    leave_now: "realist", // 补足现实约束
    wait_offer: "conditional", // 为坚持原立场增加退出机制
    set_deadline: "conditional", // 为折中加退出机制
  },
  depends: {
    leave_now: "realist", // 补足现实约束
    wait_offer: "action", // 提醒等待的代价
    set_deadline: "conditional", // 强化条件化路径
  },
};

export function secondRoundTarget(firstChoice: FirstChoice, secondChoice: SecondChoice): SeatId {
  return secondRoundTable[firstChoice][secondChoice];
}
