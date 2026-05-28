import { useState } from 'react';
import { simulateBattle, type BattleEvent } from '../../domain/battle';
import { initialCharacters, initialEnemies, initialQuests, initialSummons, initialWeapons } from '../../domain/content';
import type { RewardStack } from '../../domain/rewards';
import type { PartyLoadout, Quest } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { BattleLog } from '../components/BattleLog';
import { IconBadge } from '../components/IconBadge';
import { RewardSummary } from '../components/RewardSummary';

function formatMinutes(durationMs: number) {
  return `${Math.round(durationMs / 60_000)} 分钟`;
}

function findRouteQuest(clearedQuestIds: string[]) {
  return (
    initialQuests.find((quest) => {
      if (clearedQuestIds.includes(quest.id)) return false;
      if (quest.kind !== 'main') return false;
      return !quest.unlockAfterQuestId || clearedQuestIds.includes(quest.unlockAfterQuestId);
    }) ?? initialQuests.find((quest) => quest.kind === 'main' && clearedQuestIds.includes(quest.id)) ?? initialQuests[0]
  );
}

function createLoadout(save: ReturnType<typeof useGame>['save']): PartyLoadout {
  return {
    characterIds: save.inventory.characterIds.slice(0, 4),
    weaponGrid: {
      mainWeaponId: save.inventory.weaponIds[0] ?? '',
      weaponIds: save.inventory.weaponIds,
    },
    mainSummonId: save.inventory.summonIds[0] ?? '',
    supportSummonId: save.inventory.summonIds[1],
  };
}

function summarizeBattle(quest: Quest, save: ReturnType<typeof useGame>['save']) {
  const enemy = initialEnemies.find((candidate) => candidate.id === quest.enemyId);
  if (!enemy) throw new Error('敌人不存在');

  const result = simulateBattle({
    characters: initialCharacters,
    weapons: initialWeapons,
    summons: initialSummons,
    enemy,
    loadout: createLoadout(save),
    random: () => 0,
  });

  return {
    result,
    events: result.turns.flatMap((turn) =>
      turn.events.slice(0, 5).map((event) => ({
        ...event,
        message: event.message ? `第 ${turn.turn} 回合：${event.message}` : `第 ${turn.turn} 回合：${event.actor} ${event.label}`,
      })),
    ),
  };
}

const questGroups = [
  { kind: 'main' as const, title: '主线副本' },
  { kind: 'boss' as const, title: 'Boss 本' },
  { kind: 'material' as const, title: '材料本' },
];

function isQuestUnlocked(quest: Quest, clearedQuestIds: string[]) {
  return !quest.unlockAfterQuestId || clearedQuestIds.includes(quest.unlockAfterQuestId);
}

export function ExpeditionScreen() {
  const { save, markQuestCleared, grantRewards, startSweep, settleActiveSweep, getSweepProgress } = useGame();
  const [battleLines, setBattleLines] = useState<string[]>([]);
  const [battleEvents, setBattleEvents] = useState<BattleEvent[]>([]);
  const [lastRewards, setLastRewards] = useState<RewardStack[]>([]);
  const [sweepCount, setSweepCount] = useState(10);
  const [message, setMessage] = useState('');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const activeQuest = initialQuests.find((quest) => quest.id === save.activeRun?.questId);
  const routeQuest = findRouteQuest(save.progress.clearedQuestIds);
  const selectedQuest = initialQuests.find((quest) => quest.id === selectedQuestId);
  const targetQuest = activeQuest ?? selectedQuest ?? routeQuest;
  const isCleared = save.progress.clearedQuestIds.includes(targetQuest.id);
  const progress = getSweepProgress();

  const handleFirstClear = () => {
    setMessage('');
    setLastRewards([]);
    try {
      const battle = summarizeBattle(targetQuest, save);
      setBattleLines([]);
      setBattleEvents(battle.events);
      if (battle.result.outcome === 'win') {
        const rewards = targetQuest.firstClearRewards.map((reward) => ({
          itemId: reward.itemId,
          kind: reward.kind,
          quantity: reward.quantity,
        }));
        markQuestCleared(targetQuest.id);
        grantRewards(rewards);
        setSelectedQuestId(targetQuest.id);
        setLastRewards(rewards);
        setMessage('首通成功');
      } else {
        setMessage('挑战失败');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '挑战失败');
    }
  };

  const handleStartSweep = () => {
    setMessage('');
    try {
      startSweep(targetQuest.id, sweepCount);
      setMessage('扫荡已开始');
      setBattleEvents([]);
      setBattleLines([`开始扫荡 ${targetQuest.name} x${sweepCount}`]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法开始扫荡');
    }
  };

  const handleSettle = () => {
    const rewards = settleActiveSweep();
    setLastRewards(rewards);
    setMessage(rewards.length > 0 ? '扫荡结算完成' : '扫荡尚未完成');
    setBattleEvents([]);
    setBattleLines(rewards.length > 0 ? [`扫荡结算：${targetQuest.name} 获得 ${rewards.length} 类奖励`] : ['扫荡进行中，暂无结算']);
  };

  const handleContinueRoute = () => {
    setSelectedQuestId(null);
    setMessage('已切回主线进度');
    setLastRewards([]);
    setBattleLines([]);
    setBattleEvents([]);
  };

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
          <strong>{save.activeRun ? `进行中 ${progress?.completedRuns ?? 0}/${save.activeRun.totalRuns}` : '待命'}</strong>
        </div>
      </div>

      <section className="panel content-panel">
        {questGroups.map((group) => (
          <div className="quest-group" key={group.kind}>
            <h2>{group.title}</h2>
            <div className="row-list">
              {initialQuests
                .filter((quest) => quest.kind === group.kind)
                .map((quest) => {
                  const unlocked = isQuestUnlocked(quest, save.progress.clearedQuestIds);
                  const cleared = save.progress.clearedQuestIds.includes(quest.id);
                  const selected = targetQuest.id === quest.id;

                  return (
                    <button
                      aria-pressed={selected}
                      className={selected ? 'quest-button selected' : 'quest-button'}
                      disabled={!unlocked || Boolean(save.activeRun)}
                      key={quest.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuestId(quest.id);
                        setMessage('');
                        setBattleLines([]);
                        setBattleEvents([]);
                      }}
                    >
                      <IconBadge label={quest.name} />
                      <span>
                        <strong>{quest.name}</strong>
                        <small>
                          难度 {quest.difficulty} / {formatMinutes(quest.runDurationMs)} / {cleared ? '已首通' : unlocked ? '可挑战' : '未解锁'}
                        </small>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </section>

      <section className="panel content-panel">
        <div className="list-item">
          <IconBadge label={targetQuest.name} />
          <div>
            <strong>{isCleared ? '已首通，可扫荡' : '未首通'}</strong>
            <span>难度 {targetQuest.difficulty}</span>
          </div>
        </div>
        <div className="actions">
          {!isCleared ? (
            <button className="primary-button" type="button" onClick={handleFirstClear}>
              开始首通
            </button>
          ) : (
            <>
              <label className="field">
                <span>回数</span>
                <input
                  max={100}
                  min={1}
                  type="number"
                  value={sweepCount}
                  onChange={(event) => setSweepCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                />
              </label>
              <button className="primary-button" type="button" onClick={handleStartSweep}>
                开始扫荡
              </button>
              <button className="secondary-button" type="button" onClick={handleSettle}>
                结算
              </button>
              {selectedQuestId && routeQuest.id !== targetQuest.id ? (
                <button className="secondary-button" type="button" onClick={handleContinueRoute}>
                  继续主线
                </button>
              ) : null}
            </>
          )}
        </div>
        {message ? <p className="status-text">{message}</p> : null}
        <RewardSummary rewards={lastRewards} />
        <BattleLog events={battleEvents} lines={battleLines} />
      </section>
    </>
  );
}
