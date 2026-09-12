// app/api/seasons/route.ts
// 赛季列表 + 详情。详见 .harness/contracts/answer.md（类似的契约风格）。
//
// GET /api/seasons          → 列出所有赛季（不含 limitedCards 详情）
// GET /api/seasons/:id      → 赛季详情（含 limitedCards）

import { NextResponse } from "next/server";
import seasons from "@/data/seasons.json";

type SeasonMeta = Omit<(typeof seasons)["S01"], "limitedCards"> & {
  limitedCardsCollected: number;
  limitedCardsTotal: number;
};

function strip(s: any) {
  const { limitedCards, ...rest } = s;
  return {
    ...rest,
    limitedCardsCollected: limitedCards.filter((c: any) => c.collected).length,
    limitedCardsTotal: limitedCards.length,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const season = (seasons as any)[id];
    if (!season) {
      return NextResponse.json({ error: `赛季 ${id} 不存在` }, { status: 404 });
    }
    return NextResponse.json(season);
  }

  const list = Object.values(seasons as any)
    .filter((s): s is NonNullable<typeof s> => typeof s === "object" && s !== null && "id" in s)
    .map(strip)
    .sort((a: any, b: any) => a.id.localeCompare(b.id));

  return NextResponse.json({ seasons: list });
}
