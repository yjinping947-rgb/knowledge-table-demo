import type { SeatId } from "@/lib/types";

type SeatLabels = Record<SeatId, string>;

// Agent 的内部 id 保持稳定；这里只改变面向用户的名称，让每个主题呈现
// 真正的两种角度，而不是所有话题都机械显示“行动派/现实派”。
const TOPIC_LABELS: Record<string, Partial<SeatLabels>> = {
  T01: { action: "主动止损派", realist: "安全垫派" }, T02: { action: "机会争取派", realist: "议价稳健派" },
  T03: { action: "提前转向派", realist: "年龄风险派" }, T04: { action: "先离开消耗派", realist: "修复节奏派" },
  T05: { action: "快速试错派", realist: "现金流稳健派" }, T06: { action: "平台资源派", realist: "小队成长派" },
  T07: { action: "转型试水派", realist: "能力迁移派" }, T08: { action: "能力转化派", realist: "门槛审慎派" },
  T09: { action: "体制机会派", realist: "稳定成本派" }, T10: { action: "主动争取派", realist: "组织现实派" },
  T11: { action: "先保身心派", realist: "支持系统派" }, T12: { action: "关系主动派", realist: "长期匹配派" },
  T13: { action: "尽早上车派", realist: "财务稳健派" }, T14: { action: "体验优先派", realist: "预算边界派" },
  T15: { action: "主动沟通派", realist: "边界保护派" }, T16: { action: "直接说开派", realist: "边界分寸派" },
  T17: { action: "拥抱变化派", realist: "风险审慎派" }, T18: { action: "自由效率派", realist: "协作现实派" },
  T19: { action: "内容试验派", realist: "经营稳健派" }, T20: { action: "增长押注派", realist: "周期稳健派" },
};

export function seatLabelsForTopic(topicId: string, topicTitle = ""): SeatLabels {
  const labels = TOPIC_LABELS[topicId];
  if (labels) return { action: labels.action!, realist: labels.realist!, conditional: "条件视角" };
  const title = topicTitle.replace(/[？?]/g, "").slice(0, 8);
  return { action: `${title || "主动"}试验派`, realist: `${title || "风险"}校准派`, conditional: "条件视角" };
}
