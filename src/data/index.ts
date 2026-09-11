// src/data/index.ts
// 数据索引：类型化导出 + 查询辅助函数。
// 详见 .harness/INDEX.md 第 1 节。

import topicJson from "./topic.json";
import seatsJson from "./seats.json";
import sourcesJson from "./sources.json";
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

export const topic = topicJson as Topic;
export const seats = seatsJson as Seat[];
export const sources = sourcesJson as Source[];

export const seatById = (id: SeatId): Seat | undefined => seats.find((s) => s.id === id);

export const sourcesBySeatId = (id: SeatId): Source[] => sources.filter((s) => s.seatId === id);

export const allowedSourceIds = (id: SeatId): string[] => seatById(id)?.sourceIds ?? [];
