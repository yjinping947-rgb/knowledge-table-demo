// src/client/knowledge-table/stages/IntroStage.tsx

import { UserSeat } from "../components/UserSeat";
import { LoadingGame } from "../components/LoadingGame";
import type { SeatId } from "@/lib/types";

export function IntroStage({ revealedSeats, loading, onProceed, seatLabels }: { revealedSeats: SeatId[]; loading: boolean; onProceed: () => void; seatLabels: Record<SeatId, string> }) {
  const nextSeat = !revealedSeats.includes("action") ? seatLabels.action : !revealedSeats.includes("realist") ? seatLabels.realist : "两方";
  return (
    <UserSeat>
      <LoadingGame active={loading} text={`正在为「${nextSeat}」查找并整理当前话题的真实观点……`} />
      <h2>{revealedSeats.length < 2 ? `先听${nextSeat}怎么说` : "两席都说完了，你怎么看？"}</h2>
      <p>{revealedSeats.length < 2 ? "先听一席，再决定要不要继续听下一席。你也可以随时举手追问。" : "A、B 两席已经把各自的想法摆上桌，接下来选一个更接近你直觉的方向。"}</p>
      <button className="primary dark" disabled={loading} onClick={onProceed}>
        {loading ? "正在准备这一席……" : revealedSeats.length === 0 ? "听听第一席观点" : revealedSeats.length === 1 ? "听听下一席观点" : "开始选择你的想法"} <span>→</span>
      </button>
    </UserSeat>
  );
}
