// app/page.tsx
// 主页：?season=S01 渲染 2 轮 demo（KnowledgeTable）；否则渲染赛季列表。
// 详见 docs/contributing/team-setup.md 与 .harness/INDEX.md 第 7 节。

import KnowledgeTable from "@/components/KnowledgeTable";
import { SeasonsShell } from "../src/client/seasons/SeasonsShell";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  if (season) {
    // 指定赛季 → 渲染 2 轮 demo（当前实现暂未按 season 切分，沿用 T01）
    return <KnowledgeTable />;
  }
  // 默认 → 渲染赛季列表
  return <SeasonsShell />;
}
