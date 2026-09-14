// app/api/topics/route.ts
// 列出正式话题（当前 T01–T20）+ 每个话题的源数量。待重采话题保留在原始语料中但不公开展示。

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
