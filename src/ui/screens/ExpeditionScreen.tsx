import { useMemo, useState } from 'react';
import { simulateBattle, type BattleEvent } from '../../domain/battle';
import { initialCharacters, initialEnemies, initialQuests, initialSummons, initialWeapons } from '../../domain/content';
import { applyCharacterProgression, applySummonProgression, applyWeaponProgression } from '../../domain/progression';
import type { RewardStack } from '../../domain/rewards';
import type { PartyLoadout, Quest, RewardTableEntry } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { BattleLog } from '../components/BattleLog';
import { RewardSummary } from '../components/RewardSummary';

type ExpeditionTab = 'main' | 'boss' | 'material';
type QuestStatusTone = 'ready' | 'cleared' | 'locked';

function createLoadout(save: ReturnType<typeof useGame>['save']): PartyLoadout {
  const weaponIds = save.formation.weaponIds.filter((id): id is string => Boolean(id));
  const summonIds = save.formation.summonIds.filter((id): id is string => Boolean(id));

  return {
    characterIds: save.formation.characterIds,
    weaponGrid: {
      mainWeaponId: weaponIds[0] ?? '',
      weaponIds,
    },
    mainSummonId: summonIds[0] ?? '',
    supportSummonId: summonIds[1],
  };
}

function summarizeBattle(quest: Quest, save: ReturnType<typeof useGame>['save']) {
  const enemy = initialEnemies.find((candidate) => candidate.id === quest.enemyId);
  if (!enemy) throw new Error('敌人不存在');

  const result = simulateBattle({
    characters: initialCharacters.map((character) => applyCharacterProgression(character, save.characterStates[character.id])),
    weapons: initialWeapons.map((weapon) => applyWeaponProgression(weapon, save.weaponStates[weapon.id])),
    summons: initialSummons.map((summon) => applySummonProgression(summon, save.summonStates[summon.id])),
    enemy,
    loadout: createLoadout(save),
    characterStates: save.characterStates,
    random: () => 0,
  });

  return {
    result,
    events: result.turns.flatMap((turn) =>
      turn.events.slice(0, 5).map((event) => ({
        ...event,
        message: event.message ? `第${turn.turn}回合：${event.message}` : `第${turn.turn}回合：${event.actor} ${event.label}`,
      })),
    ),
  };
}

function isQuestUnlocked(quest: Quest, clearedQuestIds: string[]) {
  return !quest.unlockAfterQuestId || clearedQuestIds.includes(quest.unlockAfterQuestId);
}

function getQuestStatus(quest: Quest, clearedQuestIds: string[]): { label: string; tone: QuestStatusTone } {
  if (!isQuestUnlocked(quest, clearedQuestIds)) {
    return { label: '未解锁', tone: 'locked' };
  }
  if (clearedQuestIds.includes(quest.id)) {
    return { label: quest.kind === 'main' ? '已通过' : '已首通，可扫荡', tone: 'cleared' };
  }
  return { label: '可挑战', tone: 'ready' };
}

function getRewardName(reward: RewardTableEntry) {
  return reward.itemId;
}

function getRewardGroupLabel(kind: RewardTableEntry['kind']) {
  switch (kind) {
    case 'weapon':
      return '武器';
    case 'summon':
      return '召唤石';
    case 'currency':
      return '货币';
    case 'material':
    case 'weaponExpMaterial':
    case 'summonExpMaterial':
    case 'characterUncapMaterial':
    case 'weaponSkillMaterial':
    case 'weaponUncapMaterial':
    case 'summonUncapMaterial':
      return '素材';
    default:
      return '掉落';
  }
}

export function ExpeditionScreen() {
  const { save, markQuestCleared, grantRewards, startSweep, settleActiveSweep } = useGame();
  const [tab, setTab] = useState<ExpeditionTab>('main');
  const [battleLines, setBattleLines] = useState<string[]>([]);
  const [battleEvents, setBattleEvents] = useState<BattleEvent[]>([]);
  const [lastRewards, setLastRewards] = useState<RewardStack[]>([]);
  const [sweepCount, setSweepCount] = useState(10);
  const [sweepInput, setSweepInput] = useState('10');
  const [message, setMessage] = useState('');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [dropModalQuestId, setDropModalQuestId] = useState<string | null>(null);

  const filteredQuests = useMemo(() => initialQuests.filter((quest) => quest.kind === tab), [tab]);
  const selectedQuest = filteredQuests.find((quest) => quest.id === selectedQuestId);
  const fallbackQuest = filteredQuests.find((quest) => isQuestUnlocked(quest, save.progress.clearedQuestIds)) ?? filteredQuests[0];
  const targetQuest = selectedQuest ?? fallbackQuest ?? initialQuests[0];
  const activeQuest = initialQuests.find((quest) => quest.id === save.activeRun?.questId);
  const dropModalQuest = initialQuests.find((quest) => quest.id === dropModalQuestId) ?? null;

  const isMainQuest = targetQuest.kind === 'main';
  const isCleared = save.progress.clearedQuestIds.includes(targetQuest.id);
  const hasActiveRun = Boolean(save.activeRun);
  const canSweep = !isMainQuest && isCleared;
  const showSettleButton = canSweep;

  const groupedDrops = useMemo(() => {
    if (!dropModalQuest) return [];

    const groups = new Map<string, RewardTableEntry[]>();
    for (const reward of dropModalQuest.dropTable) {
      const label = getRewardGroupLabel(reward.kind);
      groups.set(label, [...(groups.get(label) ?? []), reward]);
    }

    return [...groups.entries()].map(([label, rewards]) => ({ label, rewards }));
  }, [dropModalQuest]);

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
    setLastRewards([]);
    setBattleEvents([]);
    try {
      startSweep(targetQuest.id, sweepCount);
      setBattleLines([`开始扫荡 ${targetQuest.name} x${sweepCount}`]);
      setMessage('扫荡已开始');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法开始扫荡');
    }
  };

  const handleEarlySettle = () => {
    const rewards = settleActiveSweep();
    setLastRewards(rewards);
    setBattleEvents([]);
    if (rewards.length > 0) {
      const settledQuestName = activeQuest?.name ?? targetQuest.name;
      setBattleLines([`提前结算 ${settledQuestName}，已发放完整回数奖励`]);
      setMessage('提前结算完成');
      return;
    }

    setBattleLines(['提前结算时没有完整回数，本次扫荡已作废']);
    setMessage('没有可结算的完整回数');
  };

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">当前周回</p>
        <h1 id="screen-title">远征</h1>
      </header>

      <section className="panel content-panel expedition-layout-panel">
        <div className="upgrade-tabbar expedition-tabbar" role="tablist" aria-label="远征分页">
          {[
            ['main', '主线'],
            ['boss', 'BOSS'],
            ['material', '素材'],
          ].map(([value, label]) => (
            <button
              aria-selected={tab === value}
              className={tab === value ? 'upgrade-tab upgrade-tab-active' : 'upgrade-tab'}
              key={value}
              role="tab"
              type="button"
              onClick={() => {
                setTab(value as ExpeditionTab);
                setSelectedQuestId(null);
                setDropModalQuestId(null);
                setSweepCount(10);
                setSweepInput('10');
                setMessage('');
                setBattleLines([]);
                setBattleEvents([]);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="panel expedition-scroll-panel expedition-list-panel">
          <div className="expedition-quest-list" data-testid={`${tab}-quest-list`}>
            {filteredQuests.map((quest) => {
              const status = getQuestStatus(quest, save.progress.clearedQuestIds);
              const selected = targetQuest.id === quest.id;
              const disabled = status.tone === 'locked';

              return (
                <div
                  className={
                    selected
                      ? `expedition-quest-row expedition-quest-row-${status.tone} selected`
                      : `expedition-quest-row expedition-quest-row-${status.tone}`
                  }
                  key={quest.id}
                >
                  <button
                    aria-pressed={selected}
                    className="quest-button expedition-quest-button"
                    data-testid={`expedition-quest-${quest.id}`}
                    disabled={disabled}
                    type="button"
                    onClick={() => {
                      setSelectedQuestId(quest.id);
                      setSweepCount(10);
                      setSweepInput('10');
                      setMessage('');
                    }}
                  >
                    <em className={`expedition-quest-state expedition-quest-state-${status.tone}`}>{status.label}</em>
                    <span>
                      <strong>{quest.name}</strong>
                      <small>{`难度 ${quest.difficulty}`}</small>
                    </span>
                  </button>
                  <button
                    className="secondary-button expedition-view-button"
                    disabled={disabled}
                    type="button"
                    onClick={() => setDropModalQuestId(quest.id)}
                  >
                    查看
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel expedition-action-bar">
          <div className="actions expedition-actions">
            {canSweep ? (
              <>
                <div className="field expedition-count-field">
                  <span>回数</span>
                  <div className="expedition-stepper">
                    <button
                      aria-label="减少回数"
                      className="secondary-button expedition-stepper-button"
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, sweepCount - 1);
                        setSweepCount(next);
                        setSweepInput(String(next));
                      }}
                    >
                      -
                    </button>
                    <div className="expedition-stepper-center">
                      <strong className="expedition-stepper-value" data-testid="expedition-sweep-count">
                        {sweepCount}
                      </strong>
                      <input
                        aria-label="回数输入"
                        className="expedition-stepper-input"
                        max={100}
                        min={1}
                        type="number"
                        value={sweepInput}
                        onBlur={() => {
                          const next = Math.min(100, Math.max(1, Number(sweepInput) || 1));
                          setSweepCount(next);
                          setSweepInput(String(next));
                        }}
                        onChange={(event) => {
                          setSweepInput(event.target.value);
                          const parsed = Number(event.target.value);
                          if (Number.isFinite(parsed) && event.target.value !== '') {
                            setSweepCount(Math.min(100, Math.max(1, parsed)));
                          }
                        }}
                      />
                    </div>
                    <button
                      aria-label="增加回数"
                      className="secondary-button expedition-stepper-button"
                      type="button"
                      onClick={() => {
                        const next = Math.min(100, sweepCount + 1);
                        setSweepCount(next);
                        setSweepInput(String(next));
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button className="primary-button" disabled={hasActiveRun} type="button" onClick={handleStartSweep}>
                  开始
                </button>
              </>
            ) : (
              <button className="primary-button" type="button" onClick={handleFirstClear}>
                开始
              </button>
            )}

            {showSettleButton ? (
              <button className="secondary-button" disabled={!hasActiveRun} type="button" onClick={handleEarlySettle}>
                提前结算
              </button>
            ) : null}
          </div>
          {message ? <p className="status-text">{message}</p> : null}
        </div>

        <div className="panel expedition-scroll-panel expedition-log-panel">
          <RewardSummary rewards={lastRewards} />
          <BattleLog events={battleEvents} lines={battleLines} />
        </div>
      </section>

      {dropModalQuest ? (
        <div className="slot-picker-backdrop upgrade-overlay" data-testid="expedition-drop-modal" onClick={() => setDropModalQuestId(null)}>
          <div aria-modal="true" className="slot-picker-modal expedition-drop-modal" role="dialog" aria-label="副本掉落" onClick={(event) => event.stopPropagation()}>
            <div className="slot-picker-header">
              <div>
                <p className="slot-picker-kicker">掉落预览</p>
                <h3>{dropModalQuest.name}</h3>
              </div>
              <button className="secondary-button slot-picker-close" type="button" onClick={() => setDropModalQuestId(null)}>
                关闭
              </button>
            </div>
            <div className="slot-picker-list expedition-drop-content">
              {groupedDrops.map((group) => (
                <section className="expedition-drop-group" key={group.label}>
                  <h4>{group.label}</h4>
                  <div className="expedition-drop-list">
                    {group.rewards.map((reward) => (
                      <div className="stat-row expedition-drop-row" key={`${reward.kind}-${reward.itemId}`}>
                        <span>{getRewardName(reward)}</span>
                        <strong>{`${Math.round(reward.chance * 100)}% / x${reward.quantity}`}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
