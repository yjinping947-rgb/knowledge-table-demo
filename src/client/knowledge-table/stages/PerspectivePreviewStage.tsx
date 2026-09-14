import type { PerspectiveResult } from "@/lib/types";
import Image from "next/image";

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
      <article className="perspective-preview" data-testid="third-seat-preview">
        <Image
          src="/assets/liukanshan-lavender.webp"
          alt="刘看山在淡紫色背景中作为第三席预览"
          width={720}
          height={405}
          sizes="(max-width: 760px) 100vw, 720px"
          style={{ width: "100%", height: "auto", objectFit: "cover", marginBottom: 16 }}
        />
        <span className="eyebrow">预览 · 条件派</span>
        <h3>{perspective.name}</h3>
        <p><b>生成依据</b>{perspective.basis}</p>
        <p><b>重构问题</b>{perspective.reframe}</p>
        <p><b>判断工具</b>{perspective.tool}</p>
        {perspective.sourceStatus === "insufficient" && <p><b>证据边界</b>{perspective.sourceNotice ?? "当前材料不足，先把它当作本桌综合视角。"}</p>}
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
