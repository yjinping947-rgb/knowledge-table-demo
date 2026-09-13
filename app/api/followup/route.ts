import { NextResponse } from "next/server";
import { loadTopics } from "@/lib/rag/topics";
import { retrieveSessionSources, sessionMode, sourceExcerpt, sourceFields } from "@/lib/session/rag";
import { followupRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = followupRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "追问内容不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const sources = await retrieveSessionSources(input.topicId, input.seatId, `${topic.title} ${input.question}`);
  const fallback = input.seatId === "action"
    ? "如果继续等待也在持续消耗身心，先停止损失本身就是一种行动。关键是确认这种消耗是否已经超过你的恢复能力。"
    : "先把现金流、替代方案和最坏情况列出来，能承受风险再行动，会比只凭当下情绪更稳。";

  return NextResponse.json({
    seatId: input.seatId,
    reply: sourceExcerpt(sources[0], fallback, 260),
    ...sourceFields(sources),
    mode: sessionMode(),
  });
}
