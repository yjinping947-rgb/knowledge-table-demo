import { NextResponse } from "next/server";

import { loadTopics } from "@/lib/rag/topics";
import { makeRequestMeta } from "@/lib/session/rag";
import { divergenceRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = divergenceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "互质信息不完整" }, { status: 400 });

  const input = parsed.data;
  const meta = makeRequestMeta(input, input.topicId);
  const topic = (await loadTopics())[input.topicId];
  if (!topic) return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });

  return NextResponse.json({
    candidates: [
      {
        id: "buffer-feasibility",
        title: "缓冲方案是否真的可行",
        detail: `双方并不否认「${input.collisionPoint}」，但对现实中是否存在有效的过渡方案判断不同。`,
        conversationQuoteIds: ["collision-challenge", "collision-response"],
      },
      {
        id: "irreversible-loss",
        title: "哪种损失更难恢复",
        detail: `一方更担心继续承受「${topic.title}」带来的累积损失，另一方更担心行动后的资源断裂。`,
        conversationQuoteIds: ["collision-challenge", "collision-response"],
      },
      {
        id: "timing-signal",
        title: "应该在什么信号出现时行动",
        detail: "双方对行动方向未必相反，真正不同的是触发行动的证据、期限和安全线。",
        conversationQuoteIds: ["collision-challenge", "collision-response"],
      },
    ],
    ...meta,
    // 当前候选由规则基于本桌对话整理，并未调用模型；不要把 AI 配置存在
    // 误报成 generated。用户可据此区分“规则兜底”与真正生成的内容。
    mode: "fallback" as const,
  });
}
