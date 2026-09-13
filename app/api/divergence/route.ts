import { NextResponse } from "next/server";
import { loadTopics } from "@/lib/rag/topics";
import { generateStructured } from "@/lib/session/rag";
import { divergenceRequestSchema } from "@/lib/validators";

type Candidate = { id: string; title: string; detail: string };

function fallbackCandidates(collisionPoint: string, topicTitle: string): Candidate[] {
  return [
    {
      id: "buffer-feasibility",
      title: "缓冲方案是否真的可行",
      detail: `双方并不否认「${collisionPoint}」，但对现实中是否存在有效的过渡方案判断不同。`,
    },
    {
      id: "irreversible-loss",
      title: "哪种损失更难恢复",
      detail: `一方更担心继续承受「${topicTitle}」带来的累积损失，另一方更担心行动后的资源断裂。`,
    },
    {
      id: "timing-signal",
      title: "应该在什么信号出现时行动",
      detail: "双方对行动方向未必相反，真正不同的是触发行动的证据、期限和安全线。",
    },
  ];
}

export async function POST(request: Request) {
  const parsed = divergenceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "互质信息不完整" }, { status: 400 });

  const input = parsed.data;
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  const fallback = fallbackCandidates(input.collisionPoint, topic.title);
  const generated = await generateStructured<Candidate[]>({
    system: `你是知识拼桌主持人。请根据两席围绕同一论点的真实质疑与回应，识别 2-3 个用户可以校准的隐藏分歧。
每个候选必须是具体的判断差异，不要写成空泛的“双方观点不同”。`,
    user: `话题：${topic.title}
用户当前倾向：${input.tendency}
碰撞点：${input.collisionPoint}
质疑：${input.challenge}
回应：${input.response}

返回 JSON 数组，每项格式为 {"id":"短英文标识","title":"不超过 20 字的分歧名称","detail":"一句话解释双方究竟判断不同在哪里"}。`,
    fallback,
  });
  const candidates = Array.isArray(generated.value)
    ? generated.value.filter(
        (candidate): candidate is Candidate =>
          Boolean(candidate) &&
          typeof candidate.id === "string" &&
          typeof candidate.title === "string" &&
          typeof candidate.detail === "string" &&
          candidate.title.trim().length > 0 &&
          candidate.detail.trim().length > 0,
      ).slice(0, 3)
    : [];

  return NextResponse.json({
    candidates: candidates.length >= 2 ? candidates : fallback,
    mode: candidates.length >= 2 ? generated.mode : "fallback",
  });
}
