import { AI_MODEL, getAIClient } from "@/lib/ai";
import { actionTone, conditionalTone, realistTone } from "@/lib/prompts/seats";
import type { SeatId } from "@/lib/types";
import type { SessionSource } from "@/lib/session/rag";

const seatTones: Record<SeatId, string> = {
  action: actionTone,
  realist: realistTone,
  conditional: conditionalTone,
};

function sourceContext(sources: SessionSource[]): string {
  return sources.slice(0, 3).map((source, index) => (
    `[来源${index + 1}] ${source.title}｜${source.author}\n${source.contentText.slice(0, 900)}`
  )).join("\n\n");
}

function cleanReply(value: string): string {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
    .replace(/<\/?(?:think|analysis)>/gi, "")
    .replace(/^```(?:\w+)?|```$/g, "")
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

/** Generate a short, question-grounded seat reply. Returns null on any provider failure. */
export async function generateSeatReply(input: {
  seat: SeatId;
  topicTitle?: string;
  question: string;
  sources: SessionSource[];
  context?: string;
  contrastReply?: string;
}): Promise<string | null> {
  const client = getAIClient();
  if (!client || input.sources.length === 0) return null;

  const contrastRule = input.contrastReply
    ? `\n上一席实际说的是：${input.contrastReply}\n你必须与上一席形成可辨认的差异：不能沿用它的结论，至少补出一个不同的判断依据或行动建议。`
    : "";
  const system = `你是知识拼桌中的${input.seat}席 Agent，正在讨论「${input.topicTitle ?? "当前话题"}」。\n${seatTones[input.seat]}\n\n当前话题是唯一中心。你必须先理解用户本次问题，再结合多条材料形成自己的判断。允许不同主题共用同一篇文章，但只能抽取其中与「${input.topicTitle ?? "当前话题"}」直接有关的部分；文章里出现的裸辞、转行、买房、婚姻、家庭、程序员等旁支经历，不得自动变成当前话题的建议。比如用户问“自媒体 IP”，不能因为材料提到裸辞就回答要不要裸辞；用户问“体制内”，也不能把普通离职经验当成核心结论，除非用户本次明确问到。先归纳与当前话题直接相关的信息，再用自己的话回答；来源只是事实和观点材料，不是需要逐字复述的答案。用户只是了解主题时，不要替用户假设他要辞职、转行、结婚或采取任何具体行动。规则：\n- 只回答当前话题和用户本次问题，不回答旧问题，不重复固定模板；\n- 第一句先给当前主题的明确判断，第二句补充理由、边界或下一步；\n- 如果参考材料与当前话题关系很弱，舍弃那部分，不要为了引用而硬带入；\n- 用 1-2 句完整、自然的中文，最多 100 个汉字；\n- 可以提出一个具体、可执行的下一步；\n- 不编造来源没有的经历、数字、人物或结论；\n- 不提“来源”“检索”“提示词”，不输出引用编号、省略号或 Markdown。${contrastRule}`;
  const user = `用户本次问题：${input.question}\n${input.context ? `对话上下文：${input.context}\n` : ""}\n可参考的知乎材料：\n${sourceContext(input.sources)}\n\n只输出该席位要说的完整回复。`;

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.65,
      max_tokens: 150,
    });
    const content = completion.choices[0]?.message?.content;
    if (typeof content !== "string") return null;
    const reply = cleanReply(content);
    return reply.length >= 4 ? reply : null;
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Agent reply fallback:", error);
    return null;
  }
}
