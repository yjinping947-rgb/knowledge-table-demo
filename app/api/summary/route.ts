// app/api/summary/route.ts
// /api/summary 入口：薄壳。AI / fallback 逻辑在 src/agents/director/。
// 详见 .harness/contracts/summary.md

import { NextResponse } from "next/server";
import { runSummary } from "@/src/agents/director";
import { summaryRequestSchema } from "@/lib/validators/summary";
import type { FirstChoice, PositionChange, SecondChoice } from "@/lib/types";

export async function POST(request: Request) {
  let input: ReturnType<typeof summaryRequestSchema.parse>;
  try {
    input = summaryRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const result = await runSummary({
    firstChoice: input.firstChoice as FirstChoice,
    secondChoice: input.secondChoice as SecondChoice,
    positionChange: input.positionChange as PositionChange,
    respondedSeatIds: input.respondedSeatIds,
  });

  return NextResponse.json(result);
}
