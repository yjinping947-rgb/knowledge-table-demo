// src/client/rooms-app/index.tsx
// Server 入口：预拉 20 房间数据 → 传给 client shell。
// 首屏 SSR 直接渲染 20 房间网格，避开 "载入 20 个房间…" 的闪烁。

import { listRooms } from "@/lib/rag";
import { RoomsShell } from "./RoomsShell";

export default async function RoomsApp() {
  const rooms = await listRooms();
  return <RoomsShell rooms={rooms} />;
}
