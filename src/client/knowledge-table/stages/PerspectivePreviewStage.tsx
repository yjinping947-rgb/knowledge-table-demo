import type { PerspectiveResult } from "@/lib/types";

export function PerspectivePreviewStage({
  perspective,
  loading,
  onInvite,
  onChange,
  onContinue,
  onOrganize,
}: {
  perspective: PerspectiveResult;
  loading: boolean;
  onInvite: () => void;
  onChange: () => void;
  onContinue: () => void;
  onOrganize: () => void;
}) {
  return (
    <>
      <h2>第三知识视角，先给你看一眼</h2>
      <article className="perspective-preview">
        <span className="eyebrow">预览 · 条件派</span>
        <h3>{perspective.name}</h3>
        <p><b>生成依据</b>{perspective.basis}</p>
        <p><b>重构问题</b>{perspective.reframe}</p>
        <p><b>判断工具</b>{perspective.tool}</p>
      </article>
      <button className="primary dark" disabled={loading} onClick={onInvite}>邀请入桌 <span>→</span></button>
      <div className="secondary-actions">
        <button disabled={loading} onClick={onChange}>换一个视角</button>
        <button disabled={loading} onClick={onContinue}>让前两席继续讨论</button>
        <button disabled={loading} onClick={onOrganize}>不邀请，直接整理</button>
      </div>
    </>
  );
}
