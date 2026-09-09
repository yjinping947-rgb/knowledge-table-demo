import { NextResponse } from "next/server";
import seats from "@/data/seats.json";
import { AI_MODEL, getAIClient } from "@/lib/ai";
import { getDiscussFallback } from "@/lib/fallback";
import { directorSystemPrompt, discussPrompt } from "@/lib/prompts";
import { discussOutputSchema, discussRequestSchema, parseModelJson } from "@/lib/validators";
import type { FirstChoice, SecondChoice } from "@/lib/types";

export async function POST(request: Request) {
  let input: ReturnType<typeof discussRequestSchema.parse>;
  try { input = discussRequestSchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: "请求参数不完整" }, { status: 400 }); }

  const fallback = getDiscussFallback(input.round, input.firstChoice as FirstChoice, input.secondChoice as SecondChoice | null);
  const client = getAIClient();
  if (!client) return NextResponse.json(fallback);

  try {
    const completion = await client.chat.completions.create({ model: AI_MODEL, messages: [{ role: "system", content: directorSystemPrompt }, { role: "user", content: discussPrompt(input) }] });
    const parsed = discussOutputSchema.parse(parseModelJson(completion.choices[0]?.message?.content || ""));
    const seat = seats.find((item) => item.id === parsed.selectedSeatId);
    if (!seat || parsed.sourceIds.some((id) => !seat.sourceIds.includes(id))) throw new Error("模型返回了不允许的来源");
    return NextResponse.json({ ...parsed, mode: "ai" });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("AI discuss fallback:", error);
    return NextResponse.json(fallback);
  }
}
