import { useState } from "react";
import type { DivergenceCandidate } from "@/lib/types";

export function DivergenceStage({
  candidates,
  loading,
  onConfirm,
  onReject,
  onOrganize,
}: {
  candidates: DivergenceCandidate[];
  loading: boolean;
  onConfirm: (value: string, selected: DivergenceCandidate[]) => void;
  onReject: () => void;
  onOrganize: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [correction, setCorrection] = useState("");
  const selected = candidates.filter((item) => selectedIds.includes(item.id));
  const value = correction.trim() || selected.map((item) => item.title).join("；");
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current);
  return (
    <>
      <h2>刚才真正卡住你的，是什么分歧？</h2>
      <p>可以选一条、组合两条，改成自己的说法，或者拒绝候选直接整理。</p>
      <div className="divergence-list" data-testid="divergence-candidate">
        {candidates.slice(0, 3).map((candidate) => (
          <button className={selectedIds.includes(candidate.id) ? "selected" : ""} disabled={loading} key={candidate.id} type="button" onClick={() => toggle(candidate.id)}>
            <b>{selectedIds.includes(candidate.id) ? "✓" : "○"}</b>
            <span><strong>{candidate.title}</strong>{candidate.detail}</span>
          </button>
        ))}
      </div>
      <label className="text-field">
        <span>修正成你的说法（可选）</span>
        <textarea disabled={loading} maxLength={300} onChange={(event) => setCorrection(event.target.value)} placeholder="我真正担心的是……" value={correction} />
      </label>
      <div className="secondary-actions">
        <button type="button" disabled={loading} onClick={onReject}>这些都不是</button>
        <button type="button" disabled={loading} onClick={onOrganize}>直接整理结果</button>
        <button className="primary dark" type="button" disabled={loading || !value} onClick={() => onConfirm(value, selected)}>确认这个分歧 <span>→</span></button>
      </div>
      {loading && <p className="loading" role="status">我在把你的校准变成一个新的知识视角……</p>}
    </>
  );
}
