import { NextResponse } from "next/server";
import { loadTopics, topicForRequest } from "@/lib/rag/topics";
import { generateStructured, retrieveSessionSources, sourceExcerpt, sourceFields } from "@/lib/session/rag";
import { perspectiveRequestSchema } from "@/lib/validators";

const perspectiveNames = ["选择权保留视角", "可逆性排序视角", "行动触发线视角"];

export async function POST(request: Request) {
  const parsed = perspectiveRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "隐藏分歧尚未确认" }, { status: 400 });

  const input = parsed.data;
  const topic = topicForRequest(await loadTopics(), input.topicId, input.customQuestion);
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const sources = await retrieveSessionSources(
    input.topicId,
    "conditional",
    `${topic.title} ${input.confirmedDivergence} 保留选择 条件 期限`,
    3,
    input.customQuestion,
  );
  const name = perspectiveNames.find((candidate) => !input.excludedNames.includes(candidate)) ?? perspectiveNames[0];
  const sourceNote = sourceExcerpt(sources[0], "先把可改变的条件与不可逆的损失分开，再设置检查点。", 190);
  const fallback = {
    name,
    basis: `来自两席互质后确认的隐藏分歧：${input.confirmedDivergence}`,
    reframe: `真正的问题不只是「${topic.title}」该选哪一边，而是哪条路径既能避免更难恢复的损失，又能保留后续调整空间。`,
    tool: "分别列出不可逆损失、仍可保留的选项与下一次复查的触发线，再选择当前最小但有效的一步。",
    reply: `先不急着裁决谁对谁错。把选择拆成“现在必须保护什么、还能保留什么、何时重新判断”三问。${sourceNote}`,
  };
  const generated = await generateStructured<typeof fallback>({
    system: `你是知识拼桌的第三知识视角生成器。
你不能替用户决定，也不能简单重复第一席或第二席。请从已确认的隐藏分歧出发，生成一个能同时处理代价、边界和后续调整的新框架。`,
    user: `话题：${topic.title}
碰撞点：${input.collisionPoint}
用户确认的隐藏分歧：${input.confirmedDivergence}
用户已经补充的条件与追问：${input.userContext || "无"}
参考来源：
${sources.map((source, index) => `[${index + 1}] ${source.title} · ${source.author}\n${source.contentText.slice(0, 700)}`).join("\n\n") || "暂无足够来源"}

返回 JSON：{"name":"视角名称","basis":"生成依据","reframe":"如何重构问题","tool":"判断工具","reply":"第三席入桌后的一段简短发言"}。每个字段都用自然中文，reply 控制在 80-180 字。`,
    fallback,
  });
  const value = generated.value;
  const valid = value && [value.name, value.basis, value.reframe, value.tool, value.reply].every(
    (field) => typeof field === "string" && field.trim().length > 0,
  );
  const perspective = valid ? value : fallback;

  return NextResponse.json({
    ...perspective,
    ...sourceFields(sources),
    mode: valid ? generated.mode : "fallback",
  });
}
