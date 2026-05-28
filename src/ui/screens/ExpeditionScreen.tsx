import { initialQuests } from '../../domain/content';
import { useGame } from '../../state/gameStore';

function formatMinutes(durationMs: number) {
  return `${Math.round(durationMs / 60_000)} 分钟`;
}

export function ExpeditionScreen() {
  const { save } = useGame();
  const activeQuest = initialQuests.find((quest) => quest.id === save.activeRun?.questId);
  const targetQuest = activeQuest ?? initialQuests[0];

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">当前周回</p>
        <h1 id="screen-title">远征</h1>
      </header>

      <div className="panel">
        <div className="stat-row">
          <span>目标副本</span>
          <strong>{targetQuest.name}</strong>
        </div>
        <div className="stat-row">
          <span>单次耗时</span>
          <strong>{formatMinutes(targetQuest.runDurationMs)}</strong>
        </div>
        <div className="stat-row">
          <span>远征状态</span>
          <strong>{save.activeRun ? `进行中 ${save.activeRun.totalRuns} 次` : '待命'}</strong>
        </div>
      </div>
    </>
  );
}
