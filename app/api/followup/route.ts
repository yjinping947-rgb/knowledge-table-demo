import { NextResponse } from "next/server";
import { loadTopics, topicForRequest } from "@/lib/rag/topics";
import { retrieveSessionSourcesDetailed, sourceExcerptRelevant, sourceFields } from "@/lib/session/rag";
import { generateSeatReply } from "@/lib/session/agent";
import { followupRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = followupRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "追问内容不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = topicForRequest(await loadTopics(), input.topicId, input.customQuestion);
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const retrievalQuery = `${topic.title} ${input.question}${input.context ? ` ${input.context.slice(-900)}` : ""}`;
  const retrieved = await retrieveSessionSourcesDetailed(input.topicId, input.seatId, retrievalQuery, 3, input.customQuestion);
  const sources = retrieved.sources;
  const fallback = input.seatId === "action"
    ? `围绕「${topic.title}」，先把你问的这件事拆成一个今天能验证的小步骤，做完看反馈再调整，不必一次把结论想死。`
    : input.seatId === "realist"
      ? `围绕「${topic.title}」，先把你提到的目标、资源和可能代价列清楚，再判断哪种做法真正承受得住。`
      : `围绕「${topic.title}」，关键不在于选一个绝对答案，而是找出会改变判断的条件，并给自己设一个复查节点。`;

  const generated = await generateSeatReply({
    seat: input.seatId,
    topicTitle: topic.title,
    question: input.question,
    context: input.context || undefined,
    sources,
  });
  return NextResponse.json({
    seatId: input.seatId,
    reply: generated ?? sourceExcerptRelevant(sources[0], input.question, fallback, 260),
    ...sourceFields(sources, retrieved.status),
    mode: generated ? "ai" : "fallback",
  });
}
