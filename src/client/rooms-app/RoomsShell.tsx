// src/client/rooms-app/RoomsShell.tsx
// Client wrapper: 根据 state 切换 RoomGrid / RoomDetail。
// 数据由父 server component 预拉，避免首页 loading 闪烁。

"use client";

import { useState } from "react";
import { RoomGrid, RoomDetail } from "../rooms";
import type { Room } from "@/lib/rag";

export function RoomsShell({ rooms }: { rooms: Room[] }) {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const current = currentRoomId ? rooms.find((r) => r.id === currentRoomId) : null;
  if (current) {
    return <RoomDetail room={current} onBack={() => setCurrentRoomId(null)} />;
  }
  return <RoomGrid rooms={rooms} onOpenRoom={setCurrentRoomId} />;
}
