// src/client/knowledge-table/stages/HomeStage.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import type { Topic } from "@/data";
import { KeySetup } from "../components/KeySetup";

export function HomeStage({ topic, onJoin }: { topic: Topic; onJoin: () => void }) {
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
      <Link className="brand" href="/" style={{ color: "inherit", textDecoration: "none" }}>
        知识拼桌 <span>· 返回大厅</span>
      </Link>
      <section className="hero-copy">
        <p className="eyebrow">今天这一桌聊</p>
        <h1>{topic.question}</h1>
        <p className="subtitle">不是替你回答，而是陪你把问题想清楚。</p>
        <button className="primary" onClick={onJoin}>
          加入拼桌 <span>→</span>
        </button>
        <p className="duration">预计体验时间 · {topic.duration}</p>
        <div className="key-setup-hero">
          <KeySetup />
        </div>
      </section>
    </main>
  );
}
