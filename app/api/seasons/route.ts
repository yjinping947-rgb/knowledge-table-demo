// app/api/seasons/route.ts
// 赛季列表 + 详情。详见 .harness/contracts/answer.md（类似的契约风格）。
//
// GET /api/seasons          → 列出所有赛季（不含 limitedCards 详情）
// GET /api/seasons?id=S01   → 赛季详情（含 limitedCards）

import { NextResponse } from "next/server";
import { seasons, type Season, type SeasonLimitedCard } from "@/data";

type SeasonSummary = Omit<Season, "limitedCards"> & {
  limitedCardsCollected: number;
  limitedCardsTotal: number;
};

function strip(s: Season): SeasonSummary {
  const { limitedCards, ...rest } = s;
  const collected = limitedCards.filter((c: SeasonLimitedCard) => c.collected).length;
  return {
    ...rest,
    limitedCardsCollected: collected,
    limitedCardsTotal: limitedCards.length,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const season = seasons[id];
    if (!season) {
      return NextResponse.json({ error: `赛季 ${id} 不存在` }, { status: 404 });
    }
    return NextResponse.json(season);
  }

  const list: SeasonSummary[] = Object.values(seasons)
    .map(strip)
    .sort((a, b) => a.id.localeCompare(b.id));

  return NextResponse.json({ seasons: list });
}
