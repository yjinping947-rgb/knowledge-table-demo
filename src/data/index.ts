// src/data/index.ts
// 数据索引：类型化导出 + 查询辅助函数。
// 详见 .harness/INDEX.md 第 1 节。

import topicJson from "./topic.json";
import seatsJson from "./seats.json";
import sourcesJson from "./sources.json";
import seasonsJson from "./seasons.json";
import type { SeatId } from "@/lib/types";

export type Topic = {
  id: string;
  question: string;
  duration: string;
  scenario: string;
};

export type Seat = {
  id: SeatId;
  name: string;
  mark: string;
  stance: string;
  arguments: string[];
  sourceIds: string[];
  color: "red" | "blue" | "green";
};

export type Source = {
  id: string;
  seatId: SeatId;
  title: string;
  summary: string;
  url: string | null;
  isMock: boolean;
};

export type SeasonLimitedCard = {
  id: string;
  name: string;
  collected: boolean;
};

export type Season = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  color: "red" | "blue" | "green";
  period: string;
  topicIds: string[];
  limitedCards: SeasonLimitedCard[];
};

export const topic = topicJson as Topic;
export const seats = seatsJson as Seat[];
export const sources = sourcesJson as Source[];

// seasons.json 顶层有 _comment / _docs 元字段，TypeScript cast 时要跳过
const seasonsRaw = seasonsJson as unknown as Record<string, Omit<Season, "id"> & { id: string }>;
export const seasons: Record<string, Season> = Object.fromEntries(
  Object.entries(seasonsRaw)
    .filter(([k]) => !k.startsWith("_"))
    .map(([k, v]) => [
      k,
      {
        ...v,
        color: v.color as Season["color"],
      } as Season,
    ]),
);

export const seatById = (id: SeatId): Seat | undefined => seats.find((s) => s.id === id);

export const sourcesBySeatId = (id: SeatId): Source[] => sources.filter((s) => s.seatId === id);

export const allowedSourceIds = (id: SeatId): string[] => seatById(id)?.sourceIds ?? [];

export const seasonById = (id: string): Season | undefined => seasons[id];

export const listSeasons = (): Season[] =>
  Object.values(seasons).sort((a, b) => a.id.localeCompare(b.id));
