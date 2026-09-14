// app/api/discuss/route.ts
// 两轮讨论：RAG 检索提供依据，聊天模型生成针对当前选择的新回答。
// 详见 .harness/contracts/discuss.md。
//
// 合并记录（三条实现线取长补短）：
// - 检索：采用队长版直接调 embedQuery + retrieveFromTopics，并把
//   firstChoice / secondChoice / round 作为 hint 传进去（关键词降级时用得到）；
//   同时保留本分支的席位过滤（检索结果必须属于当前席）。
// - 生成：统一走 generateSeatReply（内部 thinking=disabled）。
// - mode：如实返回本次实际路径。查过全仓，除 /api/answer（走 pipeline，另一条路径）
//   外没有任何测试或客户端要求 discuss 恒为 "ai"，所以不再硬编码。

import { NextResponse } from "next/server";
import { discussRequestSchema } from "@/lib/validators";
import { loadTopics } from "@/lib/rag/topics";
import { getDiscussFallback } from "@/lib/fallback";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import { generateSeatReply, makeRequestMeta, retrieveSessionSources, sourceFields } from "@/lib/session/rag";
import type { FirstChoice, SecondChoice, SeatId } from "@/lib/types";

// 沿用原 fallback 表的"立意映射"逻辑：firstChoice 决定首轮应被谁回应，secondChoice 决定次轮
const FIRST_SEAT: Record<FirstChoice, SeatId> = {
  support_quit: "action",
  oppose_quit: "realist",
  depends: "conditional",
};
const SECOND_SEAT: Record<SecondChoice, SeatId> = {
  leave_now: "action",
  wait_offer: "realist",
  set_deadline: "conditional",
};

function buildQuery(input: { firstChoice: FirstChoice; secondChoice?: SecondChoice | null; round: 1 | 2 }, topicTitle: string): string {
  if (input.round === 1) {
    return `${topicTitle} ${input.firstChoice} 实际经验 真实案例`;
  }
  return `${topicTitle} ${input.secondChoice} 的真实经历`;
}

function buildFallback(input: { firstChoice: FirstChoice; secondChoice?: SecondChoice | null; round: 1 | 2 }) {
  return getDiscussFallback(input.round, input.firstChoice, input.secondChoice ?? null);
}

async function buildTopicFallback(
  input: ReturnType<typeof discussRequestSchema.parse>,
  topicTitle: string,
  seat: SeatId,
) {
  const top = await retrieveSessionSources(
    input.topicId,
    seat,
    `${topicTitle} ${input.firstChoice} ${input.secondChoice ?? ""} 真实经历`,
    3,
  );
  if (top.length === 0) return { ...buildFallback(input), mode: "fallback" as const };
  return {
    selectedSeatId: seat,
    reply: top[0].contentText.slice(0, 280),
    hostComment: `围绕「${topicTitle}」，请 ${top[0].author} 先接话。`,
    ...sourceFields(top),
    mode: "fallback" as const,
  };
}

export async function POST(request: Request) {
  let input: ReturnType<typeof discussRequestSchema.parse>;
  try {
    input = discussRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const topics = await loadTopics();
  const currentTopic = topics[input.topicId];
  if (!currentTopic) {
    return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });
  }

  const seat = input.round === 1
    ? FIRST_SEAT[input.firstChoice]
    : SECOND_SEAT[input.secondChoice!];

  // 1. embedding（缺 key 时拿不到 vec，retrieveFromTopics 会退化为 keyword + authorityLevel 排序）
  const query = buildQuery(input, currentTopic.title);
  let queryVec: number[] | null = null;
  try {
    queryVec = await embedQuery(query);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("discuss retrieval failed:", error);
    return NextResponse.json({ ...makeRequestMeta(input, input.topicId), ...await buildTopicFallback(input, currentTopic.title, seat) });
  }

  // 2. RAG 检索（限定当前话题 + seat）。queryVec 缺失时仍可走关键词排序。
  const top = (
    await retrieveFromTopics(
      queryVec,
      { topicId: input.topicId, seat },
      3,
      { firstChoice: input.firstChoice, secondChoice: input.secondChoice ?? undefined, round: input.round, query },
    )
  ).filter((source) => source.seat === seat);

  if (top.length === 0) {
    return NextResponse.json({ ...makeRequestMeta(input, input.topicId), ...await buildTopicFallback(input, currentTopic.title, seat) });
  }

  const fallback = buildFallback(input);
  const generated = await generateSeatReply({
    topicTitle: currentTopic.title,
    seat,
    question: input.round === 1
      ? `请针对用户"${input.firstChoice}"的选择，围绕当前话题做一次第一席/第二席发言，提出一个有依据的关键追问。`
      : `请针对用户在具体情境下选择"${input.secondChoice}"，指出该选择需要面对的一个关键条件或代价。`,
    sources: top,
    fallback: fallback.reply,
  });

  return NextResponse.json({
    ...makeRequestMeta(input, input.topicId),
    selectedSeatId: seat,
    reply: generated.reply,
    hostComment: `围绕「${currentTopic.title}」，${seat === "action" ? "行动派" : seat === "realist" ? "现实派" : "条件派"}回应了你的选择。`,
    ...sourceFields(top, seat),
    mode: generated.mode,
  });
}
