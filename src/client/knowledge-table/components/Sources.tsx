// src/client/knowledge-table/components/Sources.tsx

import { seats, sources } from "@/data";

export function Sources() {
  return (
    <section className="sources">
      <div className="section-title">
        <p className="eyebrow">本桌观点来源</p>
        <h2>9 条模拟来源，均不可跳转</h2>
        <span>模拟观点数据，仅用于 Demo；正式版本将替换为真实知乎回答。</span>
      </div>
      <div className="source-list">
        {seats.map((seat) => (
          <details key={seat.id}>
            <summary>
              <b>{seat.name}</b>
              <span>{seat.sourceIds.join(" · ")}</span>
              <i>＋</i>
            </summary>
            <div>
              {sources
                .filter((source) => source.seatId === seat.id)
                .map((source) => (
                  <article key={source.id}>
                    <b>
                      {source.id} · {source.title}
                    </b>
                    <p>{source.summary}</p>
                    <small>模拟来源，暂不可跳转</small>
                  </article>
                ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
