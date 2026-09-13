// src/client/knowledge-table/stages/IntroStage.tsx

import { UserSeat } from "../components/UserSeat";

export function IntroStage({ onProceed }: { onProceed: () => void }) {
  return (
    <UserSeat>
      <h2>两种答案，各自在担心什么？</h2>
      <p>第一席和第二席先围绕同一个问题发言，第三知识视角会在你校准分歧后再入桌。</p>
      <button className="primary dark" onClick={onProceed}>
        听听两席观点 <span>→</span>
      </button>
    </UserSeat>
  );
}
