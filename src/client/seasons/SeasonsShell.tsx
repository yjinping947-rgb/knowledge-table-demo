// src/client/seasons/SeasonsShell.tsx
// 赛季列表页（4 个赛季卡片）。
// 客户端组件：从 /api/seasons 拉数据，点击卡片进入对应赛季的 demo（暂复用现有 KnowledgeTable）。

"use client";

import { useEffect, useState } from "react";

type Season = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  color: "red" | "blue" | "green";
  period: string;
  topicIds: string[];
  limitedCardsCollected: number;
  limitedCardsTotal: number;
};

const COLOR_CLASS: Record<Season["color"], string> = {
  red: "seasons-card-red",
  blue: "seasons-card-blue",
  green: "seasons-card-green",
};

export function SeasonsShell() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/seasons")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setSeasons(j.seasons || []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <main className="seasons-loading">载入赛季中…</main>;
  if (error) return <main className="seasons-loading">载入失败：{error}</main>;
  if (seasons.length === 0) return <main className="seasons-loading">暂无赛季</main>;

  return (
    <main className="seasons-page">
      <header className="seasons-header">
        <h1 className="seasons-title">争鸣</h1>
        <p className="seasons-subtitle">AI 思辨书案 · 每周一个赛季</p>
      </header>

      <section className="seasons-list">
        {seasons.map((s) => (
          <article
            key={s.id}
            className={`seasons-card ${COLOR_CLASS[s.color]} ${activeId === s.id ? "seasons-card-active" : ""}`}
            onClick={() => setActiveId(s.id)}
            data-dom-id={`season-${s.id}`}
            tabIndex={0}
          >
            <header className="seasons-card-head">
              <span className="seasons-card-id">{s.id}</span>
              <h2 className="seasons-card-title">{s.title}</h2>
              <p className="seasons-card-subtitle">{s.subtitle}</p>
            </header>
            <p className="seasons-card-desc">{s.description}</p>
            <footer className="seasons-card-foot">
              <div className="seasons-card-tags">
                {s.tags.map((t) => (
                  <span key={t} className="seasons-tag">{t}</span>
                ))}
              </div>
              <div className="seasons-card-progress">
                <span>限定卡 {s.limitedCardsCollected} / {s.limitedCardsTotal}</span>
                <span>{s.period}</span>
              </div>
              {activeId === s.id && (
                <div className="seasons-card-actions">
                  <a
                    className="seasons-start-btn"
                    href={`/?season=${s.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    进入赛季
                  </a>
                  <span className="seasons-card-note">（当前 demo 暂未按 season 切分，复用 T01）</span>
                </div>
              )}
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
