// app/api/topics/route.ts
// 列出 20 话题 + 每话题来源数（用于 UI 概览）。

import { NextResponse } from "next/server";
import { listTopics } from "@/lib/rag";

export async function GET() {
  const topics = await listTopics();
  return NextResponse.json({ topics });
}
