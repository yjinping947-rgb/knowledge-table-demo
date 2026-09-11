// src/client/knowledge-table/components/Sources.tsx
// 20 话题 × 3 派 RAG 知识库概览。客户端 fetch /api/topics。

import { useEffect, useState } from "react";

type TopicSummary = { id: string; title: string; sourceCount: number };

export function Sources() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const total = topics.reduce((s, t) => s + t.sourceCount, 0);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((j) => {
        setTopics(j.topics ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="sources">
      <div className="section-title">
        <p className="eyebrow">本桌观点来源</p>
        <h2>基于 20 话题 × 3 派 真实知乎知识库</h2>
        <span>
          从知乎开放平台检索得到 {total} 条真实回答，按 cosine 相似度匹配最相关的 3 条展示。原文链接可点击跳转。
        </span>
      </div>
      {loading ? (
        <p style={{ padding: 24, textAlign: "center", color: "var(--gray)" }}>载入知识库…</p>
      ) : (
        <div className="source-list">
          {topics.map((t) => (
            <details key={t.id}>
              <summary>
                <b>{t.id} · {t.title}</b>
                <span>{t.sourceCount} 条</span>
                <i>＋</i>
              </summary>
              <div>
                <p style={{ padding: 12, color: "var(--gray)", fontSize: 13 }}>
                  该话题下共 {t.sourceCount} 条真实知乎回答，分行动派 / 现实派 / 条件派三类。
                  回答在用户做选择后由 RAG 检索 top-3 注入到 reply，点击「查看原文」可跳转到知乎原文。
                </p>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
