// src/client/knowledge-table/stages/ResultStage.tsx
// 最终结果页：讨论地图 + 立场轨迹 + 来源 + 重置。

import Image from "next/image";
import { MapCard } from "../components/MapCard";
import { Sources } from "../components/Sources";
import type { SummaryResult } from "@/lib/types";

export function ResultStage({
  summary,
  onReset,
  topicId,
  topicTitle,
}: {
  summary: SummaryResult;
  onReset: () => void;
  topicId: string;
  topicTitle: string;
}) {
  return (
    <main className="result-page">
      <header className="result-hero">
        <Image
          src="/assets/liukanshan-blue.jpg"
          alt="刘看山在蓝色背景中打羽毛球"
          fill
          sizes="100vw"
        />
        <div className="result-title">
          <p className="eyebrow">一桌之后 · 本桌思考轨迹</p>
          <h1>
            你把问题
            <br />
            想到了哪一步？
          </h1>
        </div>
        <span className="map-stamp">
          讨论地图
          <br />
          NO. 001
        </span>
      </header>
      <div className="result-body">
        <div className="mode-line">{summary.mode === "ai" ? "AI 实时生成" : "演示模式生成"}</div>
        <section className="map-grid">
          <MapCard kind="consensus" label="01 / 共识">
            {summary.consensus}
          </MapCard>
          <MapCard kind="disagreement" label="02 / 真正分歧">
            {summary.disagreement}
          </MapCard>
          <MapCard kind="assumption" label="03 / 隐藏前提">
            {summary.hiddenAssumption}
          </MapCard>
          <MapCard kind="open" label="04 / 还没解决">
            {summary.openQuestion}
          </MapCard>
        </section>
        <section className="trajectory">
          <p className="eyebrow">你的立场轨迹</p>
          <div className="track">
            <div>
              <b>讨论前</b>
              <p>{summary.trajectory.before}</p>
            </div>
            <i>→</i>
            <div>
              <b>情境中</b>
              <p>{summary.trajectory.during}</p>
            </div>
            <i>→</i>
            <div>
              <b>讨论后</b>
              <p>{summary.trajectory.after}</p>
            </div>
          </div>
        </section>
        {summary.thoughtTrail && (
          <section className="thought-trail">
            <div className="section-title">
              <p className="eyebrow">本桌思考轨迹</p>
              <h2>你不是得到了一个答案，而是多了几条判断线</h2>
            </div>
            <div className="thought-trail-list">
              <article>
                <b>01 / 初始倾向</b>
                <p>{summary.thoughtTrail.tendency}</p>
              </article>
              <article>
                <b>02 / 选择的碰撞点</b>
                <p>{summary.thoughtTrail.collisionPoint}</p>
              </article>
              <article>
                <b>03 / 带来动摇的质疑</b>
                <p>{summary.thoughtTrail.challenge}</p>
                <p>{summary.thoughtTrail.response}</p>
              </article>
              <article>
                <b>04 / 确认的隐藏分歧</b>
                <p>{summary.thoughtTrail.confirmedDivergence}</p>
              </article>
              <article>
                <b>05 / 第三席带来的新理解</b>
                <p>{summary.thoughtTrail.perspective}</p>
              </article>
              <article>
                <b>06 / 离桌时</b>
                <p>{summary.thoughtTrail.departure}</p>
              </article>
            </div>
          </section>
        )}
        <Sources topicId={topicId} topicTitle={topicTitle} />
        <div className="result-actions">
          <button className="primary dark" onClick={onReset}>
            再坐一桌 <span>↻</span>
          </button>
          <p>同一个问题，也可以换一种立场重新走一遍。</p>
        </div>
      </div>
    </main>
  );
}
