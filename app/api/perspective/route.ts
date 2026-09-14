import { NextResponse } from "next/server";

import { loadTopics } from "@/lib/rag/topics";
import {
  generateSeatReply,
  makeRequestMeta,
  retrieveSessionSources,
  seatFallback,
  withSourceFields,
} from "@/lib/session/rag";
import { perspectiveRequestSchema } from "@/lib/validators";

const perspectiveNames = ["选择权保留视角", "可逆性排序视角", "行动触发线视角"];

export async function POST(request: Request) {
  const parsed = perspectiveRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "隐藏分歧尚未确认" }, { status: 400 });

  const input = parsed.data;
  const meta = makeRequestMeta(input, input.topicId);
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const sources = await retrieveSessionSources(
    input.topicId,
    "conditional",
    `${topic.title} ${input.confirmedDivergence} 保留选择 条件 期限`,
  );
  const name = perspectiveNames.find((candidate) => !input.excludedNames.includes(candidate)) ?? perspectiveNames[0];
  const safeSources = sources.filter((source) => topic.seats.conditional.some((item) => item.contentId === source.contentId));
  const generationEvidence = {
    divergenceId: input.divergenceId ?? "confirmed-divergence",
    conversationQuoteIds: ["collision-challenge", "collision-response"],
  };
  const generated = await generateSeatReply({
    topicTitle: topic.title,
    seat: "conditional",
    question: `基于隐藏分歧「${input.confirmedDivergence}」重构问题，并给出可执行判断工具。`,
    sources: safeSources,
    userAddedConditions: input.userAddedConditions,
    conversationContext: [
      input.firstSeatStatement ? `第一席：${input.firstSeatStatement}` : "",
      input.secondSeatStatement ? `第二席：${input.secondSeatStatement}` : "",
      input.challenge ? `质疑：${input.challenge}` : "",
      input.response ? `回应：${input.response}` : "",
    ].filter(Boolean).join("\n"),
    fallback: seatFallback("conditional", input.confirmedDivergence, input.userAddedConditions),
  });
  // 只有真正经过聊天模型综合且有绑定证据时才称为 sufficient；
  // 纯规则 fallback 即使检索到了材料，也不能声称关键 claim 已被验证。
  const sourceStatus = generated.mode === "generated" && safeSources.length > 0 ? "sufficient" : "insufficient";
  const claims = [
    {
      claim: "将不可逆损失、可保留选项和复查信号分开排序",
      importance: "key" as const,
      sourceIds: safeSources.slice(0, 1).map((source) => source.contentId),
      supportStatus: safeSources.length > 0 ? "supported" as const : "unsupported" as const,
      supportExplanation: safeSources.length > 0 ? "条件派来源讨论了过渡期和判断条件。" : "当前席位没有检索到足够相关材料。",
    },
  ];

  return NextResponse.json({
    ...meta,
    name,
    // 第三席即使使用确定性兜底，也属于“基于本桌对话的 AI 综合视角”，
    // 不是某个知乎席位的 retrieval 摘录；sourceStatus 会单独表达证据是否足够。
    origin: "ai_synthesis",
    generatedFrom: generationEvidence,
    generationEvidence,
    basis: `来自两席互质后确认的隐藏分歧：${input.confirmedDivergence}`,
    reframe: `真正的问题不只是「${topic.title}」该选哪一边，而是哪条路径既能避免更难恢复的损失，又能保留后续调整空间。`,
    tool: "分别列出不可逆损失、仍可保留的选项与下一次复查的触发线，再选择当前最小但有效的一步。",
    judgmentTool: ["列出不可逆损失", "标记可保留选项", "设置复查触发线"],
    // fallback 也必须是针对本桌问题的安全框架，不能把检索到的原文片段直接当回答。
    reply: generated.reply,
    ...withSourceFields(safeSources, "conditional"),
    knowledgeEvidence: { claims },
    claims,
    sourceStatus,
    sourceNotice: sourceStatus === "insufficient" ? "当前条件派材料不足；这是基于本桌对话生成的判断框架，不代表知乎作者观点。" : "",
    mode: generated.mode,
  });
}
