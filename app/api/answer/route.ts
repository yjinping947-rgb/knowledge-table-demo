// app/api/answer/route.ts
// /api/answer 入口：薄壳。RAG 逻辑在 src/lib/rag/。

import { NextResponse } from "next/server";
import { runRag } from "@/lib/rag";

export async function POST(request: Request) {
  let body: { question?: string; k?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }
  if (!body.question || typeof body.question !== "string") {
    return NextResponse.json({ error: "缺少 question 字段" }, { status: 400 });
  }
  const result = await runRag(body.question, body.k ?? 4);
  return NextResponse.json(result);
}
