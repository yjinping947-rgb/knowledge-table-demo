import { NextResponse } from "next/server";
import { loadTopics } from "@/lib/rag/topics";
import { retrieveSessionSources, sessionMode, sourceExcerpt, sourceFields } from "@/lib/session/rag";
import type { SeatId } from "@/lib/types";
import { collisionRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = collisionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "碰撞点参数不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const originalSeat = input.selectedSeatId as SeatId;
  const opposingSeat: SeatId = originalSeat === "action" ? "realist" : "action";
  const [challengeSources, responseSources] = await Promise.all([
    retrieveSessionSources(input.topicId, opposingSeat, `${topic.title} 质疑 ${input.collisionPoint}`),
    retrieveSessionSources(input.topicId, originalSeat, `${topic.title} 回应 ${input.collisionPoint}`),
  ]);

  const challengeFallback = originalSeat === "action"
    ? "这个损失需要处理，但为什么一定要立刻行动？请假、调整安排或先建立缓冲，是否也能降低损失？"
    : "等待能降低眼前风险，但如果等待本身让状态继续恶化，所谓安全会不会只是把更难恢复的损失往后推？";
  const responseFallback = originalSeat === "action"
    ? "缓冲方案只有在现实中可执行时才成立。如果已经反复尝试且消耗仍在加剧，继续等待同样是一种有成本的选择。"
    : "并不是所有等待都等于拖延。只要设置明确期限和退出条件，准备过程也可以是在主动保留选择权。";

  return NextResponse.json({
    challenge: {
      seatId: opposingSeat,
      reply: `${challengeFallback} ${sourceExcerpt(challengeSources[0], "", 150)}`.trim(),
      ...sourceFields(challengeSources),
    },
    response: {
      seatId: originalSeat,
      reply: `${responseFallback} ${sourceExcerpt(responseSources[0], "", 150)}`.trim(),
      ...sourceFields(responseSources),
    },
    hostComment: `围绕「${input.collisionPoint}」，两席完成了一次质疑与回应。`,
    mode: sessionMode(),
  });
}
