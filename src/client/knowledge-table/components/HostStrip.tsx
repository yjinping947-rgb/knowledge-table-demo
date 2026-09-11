// src/client/knowledge-table/components/HostStrip.tsx

import Image from "next/image";

export function HostStrip({ text }: { text: string }) {
  return (
    <section className="host-strip">
      <Image src="/assets/liukanshan-white.jpg" alt="刘看山坐在木头上主持讨论" fill sizes="100vw" />
      <div className="host-copy">
        <span>刘看山 · 本桌主持</span>
        <p>{text}</p>
      </div>
    </section>
  );
}
