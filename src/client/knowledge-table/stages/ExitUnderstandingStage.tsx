import { useState } from "react";

export function ExitUnderstandingStage({
  initialValue,
  loading,
  onSubmit,
  onSkip,
}: {
  initialValue?: string;
  loading: boolean;
  onSubmit: (value: string) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  return (
    <>
      <h2>离桌时，你现在带走的理解是……</h2>
      <p>写下一句话就好。它会帮助结果卡保留你的判断，不会替你下结论。</p>
      <label className="text-field">
        <span>可选表达</span>
        <textarea
          autoFocus
          maxLength={240}
          disabled={loading}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="我现在更想先确认……"
        />
      </label>
      <div className="secondary-actions">
        <button type="button" disabled={loading} onClick={onSkip}>跳过，直接整理</button>
        <button className="primary dark" type="button" disabled={loading} onClick={() => onSubmit(value.trim())}>
          留下这句话 <span>→</span>
        </button>
      </div>
    </>
  );
}
