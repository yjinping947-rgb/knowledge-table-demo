// src/client/knowledge-table/components/MapCard.tsx

import type { ReactNode } from "react";

export function MapCard({
  kind,
  label,
  children,
}: {
  kind: "consensus" | "disagreement" | "assumption" | "open";
  label: string;
  children: ReactNode;
}) {
  return (
    <article className={`map-card ${kind}`}>
      <span>{label}</span>
      <p>{children}</p>
    </article>
  );
}
