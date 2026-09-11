// src/client/rooms-app/index.tsx
// 主页入口：根据 state 切换 RoomGrid / RoomDetail。

"use client";

import { useEffect, useState } from "react";
import { RoomGrid, RoomDetail } from "../rooms";
import type { Room } from "@/lib/rag";
import styles from "../rooms/rooms.module.css";

export default function RoomsApp() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/answer")
      .then((r) => r.json())
      .then((j) => {
        setRooms(j.rooms ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <main className={styles.roomsLoading}>载入 20 个房间…</main>;
  }

  const current = currentRoomId ? rooms.find((r) => r.id === currentRoomId) : null;
  if (current) {
    return <RoomDetail room={current} onBack={() => setCurrentRoomId(null)} />;
  }
  return <RoomGrid rooms={rooms} onOpenRoom={setCurrentRoomId} />;
}
