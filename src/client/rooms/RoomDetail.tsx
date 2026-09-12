// src/client/rooms/RoomDetail.tsx
// 单个房间的 chat 界面。
// 顶部答主信息 + 语料摘要；中部历史消息；底部输入框。
// 优化：欢迎页 quick replies + 错误重试按钮。

"use client";

import { useState } from "react";
import type { Room } from "@/lib/rag";
import type { RagResult } from "@/lib/rag";
import styles from "./rooms.module.css";

type ChatMsg = {
  role: "user" | "agent";
  text: string;
  retrieved?: Array<RagItem & { score: number }>;
  error?: boolean;
};

type RagItem = {
  contentId: string;
  title: string;
  author: string;
  contentText: string;
  url: string;
  voteUpCount: number;
  commentCount: number;
  score: number;
};

const QUICK_REPLIES = [
  "我该听你的建议吗？",
  "你当时是怎么熬过来的？",
  "如果再选一次你会怎么选？",
  "最关键的一个判断标准是什么？",
];

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
  const [pending, setPending] = useState<string | null>(null);

  const send = async (q?: string) => {
    const text = (q ?? input).trim();
    if (!text || loading) return;
    if (!q) setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    setPending(text);
    try {
      const r = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, roomId: room.id, k: 3 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: RagResult = await r.json();
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: data.answer, retrieved: data.retrieved },
      ]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `请求失败（${detail}），点重试再发一次。`,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      setPending(null);
    }
  };

  const retry = (q: string) => {
    // 删掉最后那条 error，再重发
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "agent" && m.error);
      if (idx === -1) return prev;
      const cut = prev.length - 1 - idx;
      return prev.slice(0, cut);
    });
    send(q);
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
          <div className={styles.roomWelcome}>
            <p className={styles.roomEmpty}>向「{room.author}」打个招呼，或者挑一个问：</p>
            <div className={styles.quickReplies}>
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  className={styles.quickReply}
                  onClick={() => send(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <article key={i} className={`${styles.chatMsg} ${m.role === "user" ? styles.chatUser : ""} ${m.error ? styles.chatError : ""}`}>
            <header>{m.role === "user" ? "你" : room.author}</header>
            <p className={styles.chatText}>{m.text}</p>
            {m.role === "agent" && m.error && (
              <button className={styles.retryBtn} onClick={() => pending ?? retry(m.text.replace(/^请求失败.*?\uff09/, "").replace(/^。/, ""))}>
                ↻ 重试
              </button>
            )}
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
        {loading && (
          <article className={`${styles.chatMsg} ${styles.chatPending}`}>
            <header>{room.author}</header>
            <p className={styles.chatText}>…</p>
          </article>
        )}
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
        <button onClick={() => send()} disabled={loading || !input.trim()}>
          {loading ? "…" : "发送"}
        </button>
      </footer>
    </main>
  );
}
