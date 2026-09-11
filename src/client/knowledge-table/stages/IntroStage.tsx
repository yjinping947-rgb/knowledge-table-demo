// src/client/knowledge-table/stages/IntroStage.tsx

import { UserSeat } from "../components/UserSeat";

export function IntroStage({ onProceed }: { onProceed: () => void }) {
  return (
    <UserSeat>
      <h2>三种答案，各自在担心什么？</h2>
      <p>三个席位不是具体人物，而是由多篇相似回答融合成的观点集合。</p>
      <button className="primary dark" onClick={onProceed}>
        听听三方观点 <span>→</span>
      </button>
    </UserSeat>
  );
}
