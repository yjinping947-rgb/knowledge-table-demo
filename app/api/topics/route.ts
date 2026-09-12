// app/api/topics/route.ts
// 列出所有话题（21 个，含 T21 AI 取代程序员）+ 每个话题的源数量。供 UI 展示。

import { NextResponse } from "next/server";
import { listTopics } from "@/lib/rag";

export async function GET() {
  const topics = await listTopics();
  return NextResponse.json({ topics });
}
