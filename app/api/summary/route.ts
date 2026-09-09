import { NextResponse } from "next/server";
import { AI_MODEL, getAIClient } from "@/lib/ai";
import { getSummaryFallback } from "@/lib/fallback";
import { summaryPrompt, summarySystemPrompt } from "@/lib/prompts";
import { parseModelJson, summaryOutputSchema, summaryRequestSchema } from "@/lib/validators";
import type { FirstChoice, PositionChange, SecondChoice } from "@/lib/types";

export async function POST(request: Request) {
  let input: ReturnType<typeof summaryRequestSchema.parse>;
  try { input = summaryRequestSchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: "请求参数不完整" }, { status: 400 }); }

  const fallback = getSummaryFallback(input.firstChoice as FirstChoice, input.secondChoice as SecondChoice, input.positionChange as PositionChange);
  const client = getAIClient();
  if (!client) return NextResponse.json(fallback);

  try {
    const completion = await client.chat.completions.create({ model: AI_MODEL, messages: [{ role: "system", content: summarySystemPrompt }, { role: "user", content: summaryPrompt(input) }] });
    const parsed = summaryOutputSchema.parse(parseModelJson(completion.choices[0]?.message?.content || ""));
    return NextResponse.json({ ...parsed, mode: "ai" });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("AI summary fallback:", error);
    return NextResponse.json(fallback);
  }
}
