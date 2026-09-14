import { useEffect, useRef, useState } from "react";

const frames = ["◐", "◓", "◑", "◒"];

export function LoadingGame({
  active,
  text = "正在邀请席位组织回答，请稍等……",
  onReturn,
}: {
  active: boolean;
  text?: string;
  onReturn?: () => void;
}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [choice, setChoice] = useState<"undecided" | "yes" | "no">("undecided");
  const [merit, setMerit] = useState(0);
  const [completed, setCompleted] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frames.length), 180);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (active) {
      wasActive.current = true;
      // Loading transitions reset this local mini-game for each request.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompleted(false);
      setChoice("undecided");
      setPlaying(false);
    } else if (wasActive.current) {
      setCompleted(true);
      setPlaying(false);
    }
  }, [active]);

  // A user who declined the mini-game should only see the normal loading
  // state.  Once loading finishes, the post-load actions are available only
  // when the user explicitly opted in to play.
  if (!active && !(completed && choice === "yes")) return null;

  const ringBell = () => {
    setPlaying(true);
    setMerit((value) => value + 1);
    window.setTimeout(() => setPlaying(false), 150);
  };
  const exit = () => {
    setPlaying(false);
    setCompleted(false);
    onReturn?.();
  };

  return (
    <div className="loading host-summary" role="status" aria-live="polite">
      {active && <><span>刘看山处理中</span><p>{frames[frame]} {text}</p></>}
      {choice === "undecided" && active ? (
        <div className="loading-game game-invite" role="group" aria-label="小游戏邀请">
          <div className="loading-game-head"><b>等待时玩个小游戏？</b><span>不影响加载</span></div>
          <div className="loading-game-actions">
            <button type="button" className="loading-game-jump" onClick={() => { setChoice("yes"); setPlaying(true); }}>好，敲木鱼</button>
            <button type="button" className="loading-game-exit" onClick={() => setChoice("no")}>不用了</button>
          </div>
        </div>
      ) : choice === "yes" ? (
      <div className="loading-game merit-game" role="group" aria-label="敲木鱼小游戏">
        <div className="loading-game-head">
          <b>{completed ? "已经准备好了" : "等待时敲一敲"}</b>
          <span>{completed ? "继续敲木鱼，还是回到讨论？" : "敲一下，功德 +1"}</span>
        </div>
        <button type="button" className={`wooden-fish ${playing ? "is-hit" : ""}`} onClick={ringBell} aria-label="敲木鱼，功德加一">
          <span aria-hidden="true">木鱼</span>
          <small>敲一下</small>
        </button>
        <p className="loading-game-score">功德 +{merit}</p>
        <div className="loading-game-actions">
          <button type="button" className="loading-game-jump" onClick={ringBell}>继续敲</button>
          <button type="button" className="loading-game-exit" onClick={exit}>回到讨论</button>
        </div>
      </div>
      ) : null}
    </div>
  );
}
