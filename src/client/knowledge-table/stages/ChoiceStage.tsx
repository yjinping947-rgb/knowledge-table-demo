// src/client/knowledge-table/stages/ChoiceStage.tsx
// 三处复用：第一轮选择 / 第二轮选择 / 反思选择

export function ChoiceStage<T extends string>({
  title,
  subtitle,
  options,
  loading,
  onChoose,
}: {
  title: string;
  subtitle?: string;
  options: { id: T; label: string }[];
  loading: boolean;
  onChoose: (id: T) => void;
}) {
  return (
    <>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      <div className="choices">
        {options.map((option, i) => (
          <button disabled={loading} key={option.id} onClick={() => onChoose(option.id)}>
            <b>{String.fromCharCode(65 + i)}</b>
            <span>{option.label}</span>
            <em>→</em>
          </button>
        ))}
      </div>
      {loading && (
        <p className="loading" role="status">
          我在看看，现在最该请谁接话……
        </p>
      )}
    </>
  );
}
