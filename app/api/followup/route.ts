import { NextResponse } from "next/server";

import { loadTopics } from "@/lib/rag/topics";
import {
  generateSeatReply,
  makeRequestMeta,
  retrieveSessionSources,
  seatFallback,
  withSourceFields,
} from "@/lib/session/rag";
import { followupRequestSchema } from "@/lib/validators";
import type { SeatId } from "@/lib/types";

export async function POST(request: Request) {
  const parsed = followupRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "追问内容不完整" }, { status: 400 });

  const input = parsed.data;
  const meta = makeRequestMeta(input, input.topicId);
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const seat = input.seatId as SeatId;
  const conditions = [
    ...(input.context.userAddedConditions ?? []),
    ...(input.userAddedConditions ?? []),
  ];
  const sources = await retrieveSessionSources(input.topicId, seat, `${topic.title} ${input.question}`, 3);
  // 检索器已按席位过滤；二次检查可防止未来检索器改动导致来源串席。
  const safeSources = sources.filter((source) => topic.seats[seat].some((item) => item.contentId === source.contentId));
  const generated = await generateSeatReply({
    topicTitle: topic.title,
    seat,
    question: input.question,
    sources: safeSources,
    userAddedConditions: conditions,
    fallback: seatFallback(seat, input.question, conditions),
  });

  return NextResponse.json({
    ...meta,
    seatId: seat,
    reply: generated.reply,
    ...withSourceFields(safeSources, seat),
    mode: generated.mode,
  });
}
