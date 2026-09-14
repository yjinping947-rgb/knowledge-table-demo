import type { Topic } from "@/data";
import { seats } from "@/data";
import { UserSeat } from "../components/UserSeat";

export function IntroStage({ topic, onProceed }: { topic: Topic; onProceed: () => void }) {
  const sourceCount = new Set(seats.flatMap((seat) => seat.sourceIds)).size;
  return (
    <UserSeat>
      <p className="eyebrow">今天这一桌 · {topic.question}</p>
      <h2>先听两席，再决定要不要请第三席</h2>
      <p>{topic.scenario}</p>
      <div className="host-summary">
        <span>这桌会怎么走</span>
        <p>第一席先说行动边界，第二席再说现实安全线。你可以从两席的具体分歧发起碰撞；第三席只在碰撞后确认隐藏分歧时可选入桌。</p>
      </div>
      <p className="duration">{sourceCount} 条本桌代表性来源 · 知识库持续更新 · {topic.duration} · 先听两席，第三席可选</p>
      <button className="primary dark" type="button" onClick={onProceed}>
        听第一席 · 行动派 <span>→</span>
      </button>
    </UserSeat>
  );
}
