// src/client/rooms/RoomDetail.tsx
// 单个房间的 chat 界面。
// 顶部答主信息 + 语料摘要；中部历史消息；底部输入框。

"use client";

import { useState } from "react";
import type { Room } from "@/lib/rag";
import type { RagResult } from "@/lib/rag";
import styles from "./rooms.module.css";

type ChatMsg = { role: "user" | "agent"; text: string; retrieved?: Array<RagItem & { score: number }> };

type RagItem = { contentId: string; title: string; author: string; contentText: string; url: string; voteUpCount: number; commentCount: number; score: number };

export function RoomDetail({
  room,
  onBack,
}: {
  room: Room;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const r = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, roomId: room.id, k: 3 }),
      });
      const data: RagResult = await r.json();
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: data.answer, retrieved: data.retrieved },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "（网络错误，请重试）" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.roomDetailPage}>
      <header>
        <button className={styles.backBtn} onClick={onBack}>← 返回 20 个房间</button>
        <div className={styles.roomDetailMeta}>
          <span className={styles.roomMark}>{room.id}</span>
          <span className={styles.roomAuthor}>{room.author}</span>
          <span className={`${styles.roomMode} ${loading ? styles.loading : ""}`}>{loading ? "生成中…" : "待命中"}</span>
        </div>
        <h1 className={styles.roomTitle}>{room.title}</h1>
        <details className={styles.roomSource}>
          <summary>答主语料（房间人设核心）</summary>
          <p>{room.excerpt}…</p>
          <a href={room.sourceUrl} target="_blank" rel="noreferrer">原文链接</a>
        </details>
      </header>

      <section className={styles.roomChat}>
        {messages.length === 0 && (
          <p className={styles.roomEmpty}>问点什么？比如"我该听你的建议吗？"</p>
        )}
        {messages.map((m, i) => (
          <article key={i} className={`${styles.chatMsg} ${m.role === "user" ? styles.chatUser : ""}`}>
            <header>{m.role === "user" ? "你" : room.author}</header>
            <p className={styles.chatText}>{m.text}</p>
            {m.retrieved && m.retrieved.length > 0 && (
              <details className={styles.chatRefs}>
                <summary>引用来源（{m.retrieved.length}）</summary>
                <ul>
                  {m.retrieved.map((it) => (
                    <li key={it.contentId}>
                      <a href={it.url} target="_blank" rel="noreferrer">
                        {it.title} — {it.author}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </section>

      <footer className={styles.roomInputBar}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`向「${room.author}」提问…`}
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          {loading ? "…" : "发送"}
        </button>
      </footer>
    </main>
  );
}
