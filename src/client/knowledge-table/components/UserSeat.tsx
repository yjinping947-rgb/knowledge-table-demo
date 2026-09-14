// src/client/knowledge-table/components/UserSeat.tsx

import type { ReactNode } from "react";

export function UserSeat({ children }: { children: ReactNode }) {
  return (
    <section className="user-seat">
      <span className="user-label">你 · 这桌的发起者</span>
      {children}
    </section>
  );
}
