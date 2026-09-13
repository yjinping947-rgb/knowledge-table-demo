// src/client/knowledge-table/components/UserSeat.tsx

import type { ReactNode } from "react";

export function UserSeat({ children }: { children: ReactNode }) {
  return (
    <section className="user-seat">
      <span className="user-label">你 · 本桌提问者</span>
      {children}
    </section>
  );
}
