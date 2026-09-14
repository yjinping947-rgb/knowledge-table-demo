// src/client/knowledge-table/stages/ResultStage.tsx
// 最终结果页：讨论地图 + 立场轨迹 + 来源 + 重置。

import Image from "next/image";
import { useState } from "react";
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
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");
  const goldenQuote = summary.goldenQuote ?? "先保护不可逆的底线，再用一个小行动换来下一次判断的证据。";
  const shareText = `知识拼桌｜${topicTitle}\n${goldenQuote}\n\n大家都同意：${summary.consensus}\n两边卡在哪：${summary.disagreement}`;

  const shareCard = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `知识拼桌｜${topicTitle}`, text: shareText });
        setShareState("shared");
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setShareState("copied");
    } catch {
      setShareState("idle");
    }
  };

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
        <p className="eyebrow">聊完这一桌 · 你带走了什么</p>
          <h1>
            你已经把这个问题
            <br />
            想清了一大步
          </h1>
        </div>
        <span className="map-stamp">
          这桌聊了什么
          <br />
          NO. 001
        </span>
      </header>
      <div className="result-body">
        <div className="mode-line">{summary.mode === "ai" ? "AI 实时生成" : "演示模式生成"}</div>
        <section className="map-grid">
          <MapCard kind="consensus" label="01 / 大家都同意">
            {summary.consensus}
          </MapCard>
          <MapCard kind="disagreement" label="02 / 两边卡在哪">
            {summary.disagreement}
          </MapCard>
          <MapCard kind="assumption" label="03 / 别忘了这件事">
            {summary.hiddenAssumption}
          </MapCard>
          <MapCard kind="open" label="04 / 你还可以再想想">
            {summary.openQuestion}
          </MapCard>
        </section>
        {summary.thoughtTrail && (
          <section className="thought-trail">
            <div className="section-title">
              <p className="eyebrow">AI 节点流 · 我们刚才怎么聊的</p>
              <h2>把刚才的对话顺一遍</h2>
            </div>
            <div className="thought-trail-list">
              <article><b>01 / 你的问题</b><p>{topicTitle}</p></article>
              <article><b>02 / 你先怎么想</b><p>{summary.thoughtTrail.tendency}</p></article>
              <article><b>03 / 你卡住的地方</b><p>{summary.thoughtTrail.collisionPoint}</p></article>
              <article><b>04 / 两边差在哪</b><p>{summary.thoughtTrail.confirmedDivergence}</p></article>
              <article><b>05 / 多出来的一个角度</b><p>{summary.thoughtTrail.perspective}</p></article>
              <article><b>06 / 带走这一步</b><p>{summary.thoughtTrail.departure}</p></article>
            </div>
          </section>
        )}
        <section className="trajectory">
          <p className="eyebrow">你一路怎么想</p>
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
        <section className="host-summary">
          <span>这桌留下一句话</span>
          <p>{goldenQuote}</p>
        </section>
        <section className="host-summary" aria-label="知识卡片分享">
          <Image src="/assets/liukanshan-blue.jpg" alt="刘看山知识拼桌卡片" width={720} height={260} style={{ width: "100%", height: "auto", display: "block", border: "2px solid" }} />
          <span>做成卡片，分享给朋友</span>
          <p>{goldenQuote}</p>
          <button className="primary dark" onClick={shareCard}>
            {shareState === "shared" ? "已打开系统分享" : shareState === "copied" ? "已复制分享文案" : "复制 / 分享这张卡片"} <span>↗</span>
          </button>
        </section>
        {summary.thoughtTrail && (
          <section className="thought-trail">
            <div className="section-title">
              <p className="eyebrow">刚才聊过的内容</p>
              <h2>你不是拿到标准答案，而是多了几种看法</h2>
            </div>
            <div className="thought-trail-list">
              <article>
                <b>01 / 初始倾向</b>
                <p>{summary.thoughtTrail.tendency}</p>
              </article>
              <article>
                <b>02 / 你选中的卡点</b>
                <p>{summary.thoughtTrail.collisionPoint}</p>
              </article>
              <article>
                <b>03 / 你追问了什么</b>
                <p>{summary.thoughtTrail.challenge}</p>
                <p>{summary.thoughtTrail.response}</p>
              </article>
              <article>
                <b>04 / 两边真正不同的地方</b>
                <p>{summary.thoughtTrail.confirmedDivergence}</p>
              </article>
              <article>
                <b>05 / 第三席补上的看法</b>
                <p>{summary.thoughtTrail.perspective}</p>
              </article>
              <article>
                <b>06 / 你可以先做什么</b>
                <p>{summary.thoughtTrail.departure}</p>
              </article>
            </div>
          </section>
        )}
        {topicId === "CUSTOM" ? (
          <section className="sources" aria-label="本次讨论来源">
            <div className="section-title">
              <p className="eyebrow">本桌观点来源</p>
              <h2>围绕你的问题，实时找来的知乎内容</h2>
              <span>自定义问题不写入固定话题库；本桌优先使用实时知乎检索，暂时找不到时不会拿其他主题的内容冒充。</span>
            </div>
          </section>
        ) : <Sources topicId={topicId} topicTitle={topicTitle} />}
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
