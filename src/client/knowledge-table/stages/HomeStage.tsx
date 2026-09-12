// src/client/knowledge-table/stages/HomeStage.tsx

"use client";

import Image from "next/image";
import { topic } from "@/data";

export function HomeStage({ onJoin }: { onJoin: () => void }) {
  return (
    <main className="hero">
      <Image
        className="hero-image"
        src="/assets/liukanshan-green.jpg"
        alt="刘看山戴着红帽站在绿色背景中"
        fill
        priority
        sizes="100vw"
      />
      <div className="brand">
        知识拼桌 <span>· DEMO</span>
      </div>
      <section className="hero-copy">
        <p className="eyebrow">今天这一桌聊</p>
        <h1>{topic.question}</h1>
        <p className="subtitle">不是替你回答，而是陪你把问题想清楚。</p>
        <button className="primary" onClick={onJoin}>
          加入拼桌 <span>→</span>
        </button>
        <p className="duration">预计体验时间 · {topic.duration}</p>
      </section>
    </main>
  );
}
