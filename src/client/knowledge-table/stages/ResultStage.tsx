// 最终结果：一张合并的“讨论地图 + 灵魂金句”分享卡。

"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { sources as localSources } from "@/data";
import { MapCard } from "../components/MapCard";
import type { DiscussionMap, SourceReference, SummaryResult } from "@/lib/types";

const modeLabel = (mode: SummaryResult["mode"]) => {
  if (mode === "generated") return "检索证据后生成";
  if (mode === "retrieval") return "来源摘录（未生成）";
  if (mode === "fallback") return "演示模式兜底";
  return "AI 生成";
};

const seatLabel = (seat: string | undefined) => ({ action: "第一席", realist: "第二席", conditional: "第三席", undecided: "暂不判断" }[seat ?? ""] ?? "当前");

function legacyMap(summary: SummaryResult, topicTitle: string): DiscussionMap {
  return {
    question: topicTitle.replace(/[？?]$/, ""),
    ripples: [
      { label: "共同保护", type: "conflict" },
      { label: "真正分歧", type: "premise" },
      { label: "仍待验证", type: "premise" },
    ],
    trajectory: {
      start: "undecided",
      checkpoints: ["collision"],
      end: "undecided",
    },
  };
}

function sourceItems(summary: SummaryResult): SourceReference[] {
  if (summary.sources?.length) return summary.sources;
  return (summary.sourceIds ?? []).map((id, index) => ({
    id,
    url: summary.sourceUrls?.[index],
    author: summary.authors?.[index],
    // 旧 summary 没有 sourceSeatIds 时，用本地索引补齐席位，避免把所有来源误标为第一席。
    seatId: localSources.find((source) => source.id === id)?.seatId ?? "action",
    kind: "knowledge" as const,
  }));
}

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
  const map = summary.discussionMap ?? legacyMap(summary, topicTitle);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const sources = useMemo(() => sourceItems(summary), [summary]);
  const shareText = [
    "知识拼桌 · 讨论余波",
    `中心问题：${map.question}`,
    ...map.ripples.slice(0, 3).map((ripple) => `· ${ripple.label}`),
    `轨迹：${seatLabel(map.trajectory.start)} → ${map.trajectory.checkpoints.map((item) => item === "collision" ? "碰撞" : seatLabel(item)).join(" → ")} → ${seatLabel(map.trajectory.end)}`,
    `带走一句：${summary.soulSentence ?? "你不是在选一个答案，而是在确认下一条边界。"}`,
    `参考来源：${sources.length} 条${sources.some((source) => source.url) ? ` · ${sources.filter((source) => source.url).slice(0, 3).map((source) => source.url).join("、")}` : ""}`,
    "来自知识拼桌",
  ].join("\n");

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "知识拼桌 · 讨论余波", text: shareText });
      else await navigator.clipboard.writeText(shareText);
    } catch {
      // 用户取消系统分享时无需打断结果页。
    }
  };

  return (
    <main className="result-page">
      <header className="result-hero">
        <Image src="/assets/liukanshan-blue.jpg" alt="刘看山在蓝色背景中打羽毛球" fill sizes="100vw" />
        <div className="result-title">
          <p className="eyebrow">一桌之后 · 讨论余波</p>
          <h1>你把问题<br />想到了哪一步？</h1>
        </div>
        <span className="map-stamp">讨论地图<br />NO. 001</span>
      </header>
      <div className="result-body">
        <div className="mode-line">{modeLabel(summary.mode)}</div>
        <section className="map-grid" data-testid="result-share-card">
          <MapCard kind="consensus" label="中心问题">
            <strong>{map.question}</strong>
          </MapCard>
          {map.ripples.slice(0, 3).map((ripple, index) => (
            <MapCard key={`${ripple.label}-${index}`} kind={ripple.type === "conflict" ? "disagreement" : ripple.type === "perspective" ? "open" : "assumption"} label={`${String(index + 1).padStart(2, "0")} / ${ripple.type === "conflict" ? "核心冲突" : ripple.type === "perspective" ? "新视角" : "隐藏前提"}`}>
              {ripple.label.slice(0, 6)}
            </MapCard>
          ))}
        </section>
        <section className="trajectory">
          <p className="eyebrow">你的立场轨迹</p>
          <div className="track">
            <div><b>起点</b><p>{seatLabel(map.trajectory.start)}</p></div>
            <i>→</i>
            <div><b>碰撞</b><p>{map.trajectory.checkpoints.map((item) => item === "collision" ? "具体问题" : seatLabel(item)).join("、")}</p></div>
            <i>→</i>
            <div><b>当前</b><p>{seatLabel(map.trajectory.end)}</p></div>
          </div>
        </section>
        <section className="thought-trail" aria-label="灵魂金句">
          <div className="section-title"><p className="eyebrow">带走一句</p><h2>{summary.soulSentence ?? "你不是在选一个答案，而是在确认下一条边界。"}</h2></div>
          {summary.openQuestion && <p className="muted">仍待验证：{summary.openQuestion}</p>}
        </section>
        <div className="result-actions">
          <button className="primary dark" type="button" onClick={share}>分享这张讨论地图 <span>↗</span></button>
          <button type="button" onClick={() => setFeedbackSent(true)}>{feedbackSent ? "感谢你的反馈" : "提供反馈"}</button>
          <p>分享内容只包含讨论结构和金句，不包含私密条件或完整聊天。</p>
        </div>
        <section className="sources" data-topic-id={topicId}>
          <button type="button" className="section-title" style={{ border: 0, background: "transparent", padding: 0, width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => setSourceOpen((value) => !value)} aria-expanded={sourceOpen}>
            <p className="eyebrow">本桌参考来源 · {topicTitle}</p><h2>查看来源与证据边界 {sourceOpen ? "－" : "＋"}</h2>
          </button>
          {sourceOpen && sources.length > 0 && <div className="source-list">{sources.map((source) => <article key={source.id}><b>{source.id} · {source.seatId === "action" ? "第一席" : source.seatId === "realist" ? "第二席" : source.seatId === "conditional" ? "第三席" : "本桌"}</b><p>{source.title ?? "本桌检索来源"}</p>{source.kind && <small>{source.kind === "knowledge" ? "知乎知识来源" : source.kind === "conversation" ? "本桌对话证据" : "用户表达"}</small>}{source.author && <small> · {source.author}</small>}{source.url && <a className="reply-source" href={source.url} target="_blank" rel="noreferrer">查看原文 ↗</a>}</article>)}</div>}
          {sourceOpen && sources.length === 0 && <p className="muted">本次结果主要由本桌对话归纳，暂无可展开的外部来源。</p>}
        </section>
        <div className="result-actions"><button className="primary dark" type="button" onClick={onReset}>再坐一桌 <span>↻</span></button><p>同一个问题，也可以换一种立场重新走一遍。</p></div>
      </div>
    </main>
  );
}
