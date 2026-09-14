import { NextResponse } from "next/server";
import { loadTopics, topicForRequest } from "@/lib/rag/topics";
import { retrieveSessionSourcesDetailed, sourceFields } from "@/lib/session/rag";
import { generateSeatReply } from "@/lib/session/agent";
import type { SeatId } from "@/lib/types";
import { collisionRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = collisionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "碰撞点参数不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = topicForRequest(await loadTopics(), input.topicId, input.customQuestion);
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const originalSeat = input.selectedSeatId as SeatId;
  const opposingSeat: SeatId = originalSeat === "action" ? "realist" : "action";
  const [challengeSources, responseSources] = await Promise.all([
    retrieveSessionSourcesDetailed(input.topicId, opposingSeat, `${topic.title} 质疑 ${input.collisionPoint}`, 3, input.customQuestion),
    retrieveSessionSourcesDetailed(input.topicId, originalSeat, `${topic.title} 回应 ${input.collisionPoint}`, 3, input.customQuestion),
  ]);
  const originalReply = originalSeat === "action" ? input.firstSeatReply : input.secondSeatReply;

  const challengeFallback = originalSeat === "action"
    ? "这个损失需要处理，但为什么一定要立刻行动？请假、调整安排或先建立缓冲，是否也能降低损失？"
    : "等待能降低眼前风险，但如果等待本身让状态继续恶化，所谓安全会不会只是把更难恢复的损失往后推？";
  const responseFallback = originalSeat === "action"
    ? "缓冲方案只有在现实中可执行时才成立。如果已经反复尝试且消耗仍在加剧，继续等待同样是一种有成本的选择。"
    : "并不是所有等待都等于拖延。只要设置明确期限和退出条件，准备过程也可以是在主动保留选择权。";
  // 质疑先生成；回应必须看到质疑原文，否则两段容易各说各话。
  const challenge = await generateSeatReply({
    topicTitle: topic.title,
    seat: opposingSeat,
    question: `请质疑「${input.collisionPoint}」这一观点，并回应用户可能担心的现实条件。你是质疑方，先指出它成立的前提，再提出一个可执行的替代路径。用户补充条件：${input.userContext || "未补充"}`,
    sources: challengeSources.sources,
    context: `用户补充条件：${input.userContext || "未补充"}\n被质疑席位的首轮发言：${originalReply || "未提供"}`,
    contrastReply: originalReply || undefined,
  });
  const response = await generateSeatReply({
    topicTitle: topic.title,
    seat: originalSeat,
    question: `请回应对「${input.collisionPoint}」的质疑。你是原观点方，必须针对下面这段质疑逐点回应：${challenge || "质疑方指出了现实条件限制"}。先承认合理担忧，再说明什么条件下你的观点仍然成立。用户补充条件：${input.userContext || "未补充"}`,
    sources: responseSources.sources,
    context: `用户补充条件：${input.userContext || "未补充"}\n质疑方刚才说：${challenge || "未生成"}`,
    contrastReply: challenge || undefined,
  });

  return NextResponse.json({
    challenge: {
      seatId: opposingSeat,
      reply: challenge ?? challengeFallback,
      ...sourceFields(challengeSources.sources, challengeSources.status),
    },
    response: {
      seatId: originalSeat,
      reply: response ?? responseFallback,
      ...sourceFields(responseSources.sources, responseSources.status),
    },
    hostComment: `围绕「${input.collisionPoint}」，两席完成了一次质疑与回应。`,
    mode: challenge && response ? "ai" : "fallback",
  });
}
