// app/api/topics/route.ts
// 列出所有话题（21 个，含 T21 AI 取代程序员）+ 每个话题的源数量。供 UI 展示。

import { NextResponse } from "next/server";
import { listTopics } from "@/lib/rag";

export async function GET(request: Request) {
  const topics = await listTopics();
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const topic = topics.find((item) => item.id === id);
    if (!topic) return NextResponse.json({ error: `话题 ${id} 不存在` }, { status: 404 });
    return NextResponse.json({ topics: [topic] });
  }
  return NextResponse.json({ topics });
}
