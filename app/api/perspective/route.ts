import { NextResponse } from "next/server";
import { loadTopics } from "@/lib/rag/topics";
import { retrieveSessionSources, sessionMode, sourceExcerpt, sourceFields } from "@/lib/session/rag";
import { perspectiveRequestSchema } from "@/lib/validators";

const perspectiveNames = ["选择权保留视角", "可逆性排序视角", "行动触发线视角"];

export async function POST(request: Request) {
  const parsed = perspectiveRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "隐藏分歧尚未确认" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const sources = await retrieveSessionSources(
    input.topicId,
    "conditional",
    `${topic.title} ${input.confirmedDivergence} 保留选择 条件 期限`,
  );
  const name = perspectiveNames.find((candidate) => !input.excludedNames.includes(candidate)) ?? perspectiveNames[0];
  const sourceNote = sourceExcerpt(sources[0], "先把可改变的条件与不可逆的损失分开，再设置检查点。", 190);

  return NextResponse.json({
    name,
    basis: `来自两席互质后确认的隐藏分歧：${input.confirmedDivergence}`,
    reframe: `真正的问题不只是「${topic.title}」该选哪一边，而是哪条路径既能避免更难恢复的损失，又能保留后续调整空间。`,
    tool: "分别列出不可逆损失、仍可保留的选项与下一次复查的触发线，再选择当前最小但有效的一步。",
    reply: `先不急着裁决谁对谁错。把选择拆成“现在必须保护什么、还能保留什么、何时重新判断”三问。${sourceNote}`,
    ...sourceFields(sources),
    mode: sessionMode(),
  });
}
