import { NextResponse } from "next/server";
import { loadTopics } from "@/lib/rag/topics";
import { generateSeatReply, retrieveSessionSources, sourceFields } from "@/lib/session/rag";
import { followupRequestSchema } from "@/lib/validators";

function fallbackReply(seatId: "action" | "realist", question: string) {
  const familyRisk = /(孩子|小孩|父母|爸妈|老人|配偶|伴侣|家人|照护|生病|住院|医疗)/.test(question);
  const moneyRisk = /(房贷|债务|现金流|存款|开销|收入|赔偿)/.test(question);
  if (seatId === "action") {
    if (familyRisk) {
      return "如果家人需要照护，止损也不等于马上裸辞。先确认照护责任、医疗支出和最低现金流；如果继续工作已经影响照护或健康，就应把离开作为明确的止损方案，而不是继续硬撑。";
    }
    if (moneyRisk) {
      return "现实支出需要算清楚，但不能因此忽略正在发生的健康损失。先划出最低生活线和最晚行动时间；如果继续工作会让你失去恢复和求职能力，就要把行动提前。";
    }
    return "如果继续等待也在持续消耗身心，先停止损失本身就是一种行动。关键不是冲动辞职，而是确认你的恢复能力、最低生活线和下一步准备是否足够。";
  }
  if (familyRisk) {
    return "家人需要照护时，现金流和保障的重要性会更高。先列出医疗与生活支出、可获得的家庭支持和替代工作安排，再设置一个明确期限，避免把谨慎变成无限期硬撑。";
  }
  if (moneyRisk) {
    return "先把现金流、固定支出和最坏情况列出来，确认中断收入后还能撑多久。若暂时不能离开，可以同步准备下一份工作并设定复查期限，而不是默认一直坚持。";
  }
  return "先把现金流、替代方案和最坏情况列出来，能承受风险再行动，会比只凭当下情绪更稳。与此同时要设定期限，避免等待变成没有终点的拖延。";
}

export async function POST(request: Request) {
  const parsed = followupRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "追问内容不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const sources = await retrieveSessionSources(input.topicId, input.seatId, `${topic.title} ${input.question}`);
  const fallback = fallbackReply(input.seatId, input.question);
  const generated = await generateSeatReply({
    topicTitle: topic.title,
    seat: input.seatId,
    question: input.question,
    sources,
    fallback,
  });

  return NextResponse.json({
    seatId: input.seatId,
    reply: generated.reply,
    ...sourceFields(sources),
    mode: generated.mode,
  });
}
