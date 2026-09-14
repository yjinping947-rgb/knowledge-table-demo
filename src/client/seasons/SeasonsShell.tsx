// src/client/seasons/SeasonsShell.tsx
// 话题大厅：按赛季分组展示话题，点击话题进入 master 风格讨论桌。

"use client";

import Image from "next/image";
import { useState } from "react";
import type { Season } from "@/data";
import type { TopicSummary } from "@/lib/rag";
import styles from "./seasons.module.css";

export function SeasonsShell({
  seasons,
  topics,
}: {
  seasons: Season[];
  topics: TopicSummary[];
}) {
  const [customQuestion, setCustomQuestion] = useState("");
  const topicMap = new Map(topics.map((item) => [item.id, item]));
  const assigned = new Set(seasons.flatMap((season) => season.topicIds));
  const extras = topics.filter((item) => !assigned.has(item.id));
  const firstTopic = seasons.flatMap((season) => season.topicIds).find((id) => topicMap.has(id)) ?? topics[0]?.id;

  return (
    <main className={styles.seasonsPage}>
      <header className={styles.seasonsHeader}>
        <Image
          className={styles.seasonsHeroImage}
          src="/assets/liukanshan-green.jpg"
          alt="刘看山戴着红帽站在绿色背景中"
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.seasonsHeaderOverlay}>
          <div className={styles.seasonsBrand}>知识拼桌 <span>· LOBBY</span></div>
          <section className={styles.seasonsHeaderCopy}>
            <p className={styles.seasonsEyebrow}>今天这一桌，聊什么</p>
            <h1 className={styles.seasonsTitle}>争鸣</h1>
            <p className={styles.seasonsSubtitle}>AI 思辨书案 · 话题大厅</p>
            <p className={styles.seasonsIntro}>从一个具体问题出发，听听不同立场如何把它想清楚。</p>
            {firstTopic && (
              <a className={styles.seasonsHeaderCta} href={`/?topic=${firstTopic}`}>
                进入第一个话题 <span>→</span>
              </a>
            )}
          </section>
          <span className={styles.seasonsHeaderMeta}>{topics.length} 个话题 · {seasons.length} 个赛季</span>
        </div>
      </header>

      <section className={styles.seasonsContent} id="topics">
        <header className={styles.seasonsSectionHead}>
          <div>
            <p className={styles.seasonsEyebrow}>话题大厅</p>
            <h2>选一个问题，坐下来聊聊</h2>
          </div>
          <span>每个话题 · 3 种立场</span>
        </header>

        <div className={styles.seasonsList}>
          {seasons.map((season) => {
            const collected = season.limitedCards.filter((card) => card.collected).length;
            const progress = season.limitedCards.length
              ? Math.round((collected / season.limitedCards.length) * 100)
              : 0;

            return (
              <article
                key={season.id}
                className={`${styles.seasonsCard} ${styles[`seasonsCard${capitalize(season.color)}`]}`}
                data-dom-id={`season-${season.id}`}
              >
                <header className={styles.seasonsCardHead}>
                  <span className={styles.seasonsCardId}>{season.id}</span>
                  <div>
                    <h2 className={styles.seasonsCardTitle}>{season.title}</h2>
                    <p className={styles.seasonsCardSubtitle}>{season.subtitle}</p>
                  </div>
                </header>
                <p className={styles.seasonsCardDesc}>{season.description}</p>
                <footer className={styles.seasonsCardFoot}>
                  <div className={styles.seasonsCardTags}>
                    {season.tags.map((tag) => <span key={tag} className={styles.seasonsTag}>{tag}</span>)}
                  </div>
                  <div className={styles.seasonsCardProgress}>
                    <div className={styles.seasonsCardProgressLabel}>
                      <span>限定卡 {collected} / {season.limitedCards.length}</span>
                      <span>{season.period}</span>
                    </div>
                    <div className={styles.seasonsCardMeter} aria-label={`限定卡完成度 ${progress}%`}>
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </footer>
                <div className={styles.seasonsTopicList}>
                  {season.topicIds.map((topicId) => {
                    const topic = topicMap.get(topicId);
                    if (!topic) return null;
                    return <TopicLink key={topic.id} topic={topic} />;
                  })}
                </div>
              </article>
            );
          })}
        </div>

        <section className={styles.seasonsExtras}>
          <div className={styles.seasonsExtrasHead}>
            <p className={styles.seasonsEyebrow}>特别篇</p>
            <h2>想聊点别的？</h2>
            <p className={styles.seasonsCustomHint}>20 个现成话题之外，也可以把你此刻真正想问的问题带上桌。</p>
          </div>
          <form className={styles.seasonsCustomForm} onSubmit={(event) => {
            event.preventDefault();
            const question = customQuestion.trim();
            if (question.length >= 4) window.location.href = `/?topic=CUSTOM&q=${encodeURIComponent(question)}`;
          }}>
            <input value={customQuestion} onChange={(event) => setCustomQuestion(event.target.value)} placeholder="输入你想和三种观点一起讨论的问题" aria-label="输入自定义问题" maxLength={120} />
            <button type="submit" disabled={customQuestion.trim().length < 4}>带问题上桌 <span>→</span></button>
          </form>
        </section>

        {extras.length > 0 && (
          <section className={styles.seasonsExtras}>
            <div className={styles.seasonsExtrasHead}>
              <p className={styles.seasonsEyebrow}>特别篇</p>
              <h2>更多正在发生的问题</h2>
            </div>
            <div className={styles.seasonsExtraList}>
              {extras.map((topic) => <TopicLink key={topic.id} topic={topic} />)}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function TopicLink({ topic }: { topic: TopicSummary }) {
  return (
    <a className={styles.seasonsTopicLink} href={`/?topic=${topic.id}`}>
      <span className={styles.seasonsTopicId}>{topic.id}</span>
      <span className={styles.seasonsTopicTitle}>{topic.title}</span>
      <span className={styles.seasonsTopicMeta}>{topic.sourceCount} 条来源 <b>→</b></span>
    </a>
  );
}

function capitalize(value: Season["color"]): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
