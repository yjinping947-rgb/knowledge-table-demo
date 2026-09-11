// app/api/answer/route.ts
// /api/answer 入口：薄壳。RAG 逻辑在 src/lib/rag/。
// 支持 roomId：进入特定房间时切换人设和检索范围。

import { NextResponse } from "next/server";
import { runRag } from "@/lib/rag";

export async function POST(request: Request) {
  let body: { question?: string; k?: number; roomId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }
  if (!body.question || typeof body.question !== "string") {
    return NextResponse.json({ error: "缺少 question 字段" }, { status: 400 });
  }
  const result = await runRag(body.question, body.k ?? 4, body.roomId);
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  // GET /api/answer?roomId=r01 → 列出房间（无 roomId 列出全部）
  const url = new URL(request.url);
  const { listRooms, getRoom } = await import("@/lib/rag");
  const roomId = url.searchParams.get("roomId");
  if (roomId) {
    const room = await getRoom(roomId);
    if (!room) return NextResponse.json({ error: `房间 ${roomId} 不存在` }, { status: 404 });
    return NextResponse.json(room);
  }
  const rooms = await listRooms();
  return NextResponse.json({ rooms });
}
