// src/client/rooms/RoomGrid.tsx
// 20 个房间网格。点击 → onOpenRoom(roomId)。

import type { Room } from "@/lib/rag";
import styles from "./rooms.module.css";

export function RoomGrid({ rooms, onOpenRoom }: { rooms: Room[]; onOpenRoom: (id: string) => void }) {
  return (
    <main className={styles.roomGridPage}>
      <header className={styles.roomGridHeader}>
        <h1>知识拼桌 · 20 个房间</h1>
        <p>每个房间由一位真实知乎答主的人设主持，点击进入开始对话。</p>
      </header>
      <section className={styles.roomGrid}>
        {rooms.map((r) => (
          <article
            key={r.id}
            className={styles.roomCard}
            onClick={() => onOpenRoom(r.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenRoom(r.id)}
          >
            <div className={styles.roomCardHead}>
              <span className={styles.roomMark}>{r.id}</span>
              <span className={styles.roomAuthor}>{r.author}</span>
            </div>
            <h2 className={styles.roomTitle}>{r.title}</h2>
            <p className={styles.roomExcerpt}>{r.excerpt}</p>
            <div className={styles.roomCardFoot}>
              <small>赞 {r.voteUpCount} · 评论 {r.commentCount}</small>
              <span className={styles.roomEnter}>进入 →</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
