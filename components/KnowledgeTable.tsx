"use client";

import Image from "next/image";
import { useState } from "react";
import seats from "@/data/seats.json";
import sources from "@/data/sources.json";
import topic from "@/data/topic.json";
import type { DiscussResult, FirstChoice, PositionChange, SecondChoice, SummaryResult } from "@/lib/types";

type Stage = "home" | "intro" | "round1-choice" | "round1-response" | "round2-choice" | "round2-response" | "reflection" | "result";
const firstOptions: { id: FirstChoice; label: string; short: string }[] = [
  { id: "support_quit", label: "工作已经严重影响身心，就应该裸辞", short: "支持裸辞" },
  { id: "oppose_quit", label: "应该先找到下一份工作，不能冲动离开", short: "反对裸辞" },
  { id: "depends", label: "要看储蓄、行业和个人情况", short: "视情况而定" }
];
const secondOptions: { id: SecondChoice; label: string }[] = [
  { id: "leave_now", label: "立即离开，先恢复状态" },
  { id: "wait_offer", label: "坚持到找到下一份工作" },
  { id: "set_deadline", label: "先请假或降低投入，同时设定离职期限" }
];
const reflectionOptions: { id: PositionChange; label: string }[] = [
  { id: "unchanged", label: "没有变化" }, { id: "slightly_changed", label: "调整了一些条件" }, { id: "changed", label: "改变了主要立场" }
];

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("request failed");
  return response.json();
}

export default function KnowledgeTable() {
  const [stage, setStage] = useState<Stage>("home");
  const [firstChoice, setFirstChoice] = useState<FirstChoice | null>(null);
  const [secondChoice, setSecondChoice] = useState<SecondChoice | null>(null);
  const [positionChange, setPositionChange] = useState<PositionChange | null>(null);
  const [responses, setResponses] = useState<(DiscussResult & { round: number })[]>([]);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = responses.at(-1);
  const activeSeat = stage.includes("response") ? latest?.selectedSeatId : undefined;
  const demoMode = responses.some((item) => item.mode === "fallback") || summary?.mode === "fallback";

  const chooseFirst = async (choice: FirstChoice) => {
    if (loading || firstChoice) return;
    setFirstChoice(choice); setLoading(true);
    try {
      const result = await postJSON<DiscussResult>("/api/discuss", { round: 1, firstChoice: choice, secondChoice: null, respondedSeatIds: [] });
      setResponses([{ ...result, round: 1 }]); setStage("round1-response");
    } catch { setFirstChoice(null); }
    finally { setLoading(false); }
  };
  const chooseSecond = async (choice: SecondChoice) => {
    if (loading || secondChoice || !firstChoice) return;
    setSecondChoice(choice); setLoading(true);
    try {
      const result = await postJSON<DiscussResult>("/api/discuss", { round: 2, firstChoice, secondChoice: choice, respondedSeatIds: responses.map((r) => r.selectedSeatId) });
      setResponses((prev) => [...prev, { ...result, round: 2 }]); setStage("round2-response");
    } catch { setSecondChoice(null); }
    finally { setLoading(false); }
  };
  const chooseReflection = async (choice: PositionChange) => {
    if (loading || positionChange || !firstChoice || !secondChoice) return;
    setPositionChange(choice); setLoading(true);
    try {
      const result = await postJSON<SummaryResult>("/api/summary", { firstChoice, secondChoice, positionChange: choice, respondedSeatIds: responses.map((r) => r.selectedSeatId) });
      setSummary(result); setStage("result");
    } catch { setPositionChange(null); }
    finally { setLoading(false); }
  };
  const reset = () => { setStage("home"); setFirstChoice(null); setSecondChoice(null); setPositionChange(null); setResponses([]); setSummary(null); setLoading(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (stage === "home") return <main className="hero">
    <Image className="hero-image" src="/assets/liukanshan-green.jpg" alt="刘看山戴着红帽站在绿色背景中" fill priority sizes="100vw" />
    <div className="brand">知识拼桌 <span>· DEMO</span></div>
    <section className="hero-copy"><p className="eyebrow">今天这一桌聊</p><h1>{topic.question}</h1><p className="subtitle">不是替你回答，而是陪你把问题想清楚。</p><button className="primary" onClick={() => setStage("intro")}>加入拼桌 <span>→</span></button><p className="duration">预计体验时间 · {topic.duration}</p></section>
  </main>;

  if (stage === "result" && summary) return <main className="result-page">
    <header className="result-hero"><Image src="/assets/liukanshan-blue.jpg" alt="刘看山在蓝色背景中打羽毛球" fill sizes="100vw" /><div className="result-title"><p className="eyebrow">两轮之后 · 本桌讨论地图</p><h1>你把问题<br />想到了哪一步？</h1></div><span className="map-stamp">讨论地图<br />NO. 001</span></header>
    <div className="result-body"><div className="mode-line">{summary.mode === "ai" ? "AI 实时生成" : "演示模式生成"}</div>
      <section className="map-grid">
        <article className="map-card consensus"><span>01 / 共识</span><p>{summary.consensus}</p></article>
        <article className="map-card disagreement"><span>02 / 真正分歧</span><p>{summary.disagreement}</p></article>
        <article className="map-card assumption"><span>03 / 隐藏前提</span><p>{summary.hiddenAssumption}</p></article>
        <article className="map-card open"><span>04 / 还没解决</span><p>{summary.openQuestion}</p></article>
      </section>
      <section className="trajectory"><p className="eyebrow">你的立场轨迹</p><div className="track"><div><b>讨论前</b><p>{summary.trajectory.before}</p></div><i>→</i><div><b>情境中</b><p>{summary.trajectory.during}</p></div><i>→</i><div><b>讨论后</b><p>{summary.trajectory.after}</p></div></div></section>
      <Sources /><div className="result-actions"><button className="primary dark" onClick={reset}>再坐一桌 <span>↻</span></button><p>同一个问题，也可以换一种立场重新走一遍。</p></div>
    </div>
  </main>;

  return <main className="discussion-page">
    <header className="topbar"><button className="wordmark" onClick={reset}>知识拼桌</button><div className="progress" aria-label="讨论进度"><span className={stage === "intro" ? "on" : "done"}>入桌</span><i /><span className={["round1-choice","round1-response"].includes(stage) ? "on" : (["round2-choice","round2-response","reflection"].includes(stage) ? "done" : "")}>第一轮</span><i /><span className={["round2-choice","round2-response"].includes(stage) ? "on" : (["reflection"].includes(stage) ? "done" : "")}>第二轮</span><i /><span className={stage === "reflection" ? "on" : ""}>整理</span></div>{demoMode ? <span className="demo-badge">演示模式</span> : <span />}</header>
    <section className="host-strip"><Image src="/assets/liukanshan-white.jpg" alt="刘看山坐在木头上主持讨论" fill sizes="100vw" /><div className="host-copy"><span>刘看山 · 本桌主持</span><p>{hostText(stage, latest, loading)}</p></div></section>
    <section className="table-area"><div className="seat-grid">{seats.map((seat, index) => <article key={seat.id} className={`seat-card ${seat.color} ${activeSeat === seat.id ? "speaking" : activeSeat ? "muted" : ""}`} style={{ animationDelay: `${index * 110}ms` }}><div className="seat-head"><span className="seat-mark">{seat.mark}</span><div><small>观点席位</small><h2>{seat.name}</h2></div>{activeSeat === seat.id && <span className="speaking-label">正在发言</span>}</div><p className="stance">“{seat.stance}”</p>{activeSeat === seat.id && latest && <div className="reply"><span>回应你的选择</span><p>{latest.reply}</p></div>}<div className="source-chips">{seat.sourceIds.map((id) => <span key={id}>{id}</span>)}</div></article>)}</div>
      <section className="user-seat"><span className="user-label">第四席 · 你</span>{stage === "intro" && <><h2>三种答案，各自在担心什么？</h2><p>三个席位不是具体人物，而是由多篇相似回答融合成的观点集合。</p><button className="primary dark" onClick={() => setStage("round1-choice")}>听听三方观点 <span>→</span></button></>}
        {stage === "round1-choice" && <Choice title="如果是现在的你，更接近哪一种想法？" options={firstOptions} loading={loading} onChoose={(id) => chooseFirst(id as FirstChoice)} />}
        {stage === "round1-response" && latest && <ResponseFooter result={latest} button="进入具体情境" onClick={() => setStage("round2-choice")} />}
        {stage === "round2-choice" && <Choice title={topic.scenario} options={secondOptions} loading={loading} onChoose={(id) => chooseSecond(id as SecondChoice)} />}
        {stage === "round2-response" && latest && <ResponseFooter result={latest} button="看看我的想法" onClick={() => setStage("reflection")} />}
        {stage === "reflection" && <Choice title="两轮下来，你的想法有变化吗？" subtitle="调整判断不代表前面选错了。" options={reflectionOptions} loading={loading} onChoose={(id) => chooseReflection(id as PositionChange)} />}
      </section>
    </section><footer className="mock-note">模拟观点数据，仅用于 Demo；正式版本将替换为真实知乎回答。</footer>
  </main>;
}

function Choice({ title, subtitle, options, loading, onChoose }: { title: string; subtitle?: string; options: { id: string; label: string }[]; loading: boolean; onChoose: (id: string) => void }) {
  return <><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}<div className="choices">{options.map((option, i) => <button disabled={loading} key={option.id} onClick={() => onChoose(option.id)}><b>{String.fromCharCode(65 + i)}</b><span>{option.label}</span><em>→</em></button>)}</div>{loading && <p className="loading" role="status">我在看看，现在最该请谁接话……</p>}</>;
}

function ResponseFooter({ result, button, onClick }: { result: DiscussResult; button: string; onClick: () => void }) {
  return <><div className="host-summary"><span>主持人捋了捋</span><p>{result.hostComment}</p></div><button className="primary dark" onClick={onClick}>{button} <span>→</span></button></>;
}

function Sources() { return <section className="sources"><div className="section-title"><p className="eyebrow">本桌观点来源</p><h2>9 条模拟来源，均不可跳转</h2><span>模拟观点数据，仅用于 Demo；正式版本将替换为真实知乎回答。</span></div><div className="source-list">{seats.map((seat) => <details key={seat.id}><summary><b>{seat.name}</b><span>{seat.sourceIds.join(" · ")}</span><i>＋</i></summary><div>{sources.filter((source) => source.seatId === seat.id).map((source) => <article key={source.id}><b>{source.id} · {source.title}</b><p>{source.summary}</p><small>模拟来源，暂不可跳转</small></article>)}</div></details>)}</div></section>; }

function hostText(stage: Stage, latest?: DiscussResult & { round: number }, loading?: boolean) {
  if (loading) return "“我在看看，现在最该请谁接话……”";
  if (stage === "intro") return "“我找到了三种看起来都有道理的答案。它们真正争论的，也许不只是要不要辞职。先听听他们怎么说？”";
  if (stage === "round1-choice") return "“有人在说健康和意义，有人在说收入和风险。先别急着找标准答案。”";
  if (stage.includes("response") && latest) return `“${latest.hostComment}”`;
  if (stage === "round2-choice") return "“抽象的态度容易说，放进具体生活里，选择可能会变。”";
  return "“两轮下来，你的想法有变化吗？调整判断不代表前面选错了。”";
}
