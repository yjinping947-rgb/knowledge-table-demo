// app/api/discuss/route.ts
// /api/discuss 入口：薄壳。AI / fallback 逻辑在 src/agents/director/。
// 详见 .harness/contracts/discuss.md

import { NextResponse } from "next/server";
import { runDiscuss } from "@/src/agents/director";
import { discussRequestSchema } from "@/lib/validators/discuss";
import type { FirstChoice, SecondChoice } from "@/lib/types";

export async function POST(request: Request) {
  let input: ReturnType<typeof discussRequestSchema.parse>;
  try {
    input = discussRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const result = await runDiscuss({
    round: input.round,
    firstChoice: input.firstChoice as FirstChoice,
    secondChoice: (input.secondChoice ?? null) as SecondChoice | null,
    respondedSeatIds: input.respondedSeatIds,
  });

  return NextResponse.json(result);
}
