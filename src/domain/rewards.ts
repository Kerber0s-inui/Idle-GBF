import type { Quest, RewardTableEntry } from './types';

export interface RewardStack {
  itemId: string;
  kind: RewardTableEntry['kind'];
  quantity: number;
}

export function summarizeRewards(rewards: RewardStack[]): RewardStack[] {
  const map = new Map<string, RewardStack>();
  for (const reward of rewards) {
    const key = `${reward.kind}:${reward.itemId}`;
    const current = map.get(key);
    map.set(key, current ? { ...current, quantity: current.quantity + reward.quantity } : { ...reward });
  }
  return [...map.values()];
}

function normalizeRunCount(runCount: number) {
  if (!Number.isFinite(runCount)) return 0;
  return Math.max(0, Math.floor(runCount));
}

function normalizeRandom(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

export function rollRewards(input: {
  quest: Quest;
  runCount: number;
  includeFirstClear: boolean;
  dropRateBonus: number;
  random: () => number;
}): RewardStack[] {
  const rewards: RewardStack[] = [];
  const runCount = normalizeRunCount(input.runCount);
  if (input.includeFirstClear) {
    rewards.push(
      ...input.quest.firstClearRewards.map((reward) => ({
        itemId: reward.itemId,
        kind: reward.kind,
        quantity: reward.quantity,
      })),
    );
  }
  for (let run = 0; run < runCount; run += 1) {
    for (const entry of input.quest.dropTable) {
      if (normalizeRandom(input.random()) < Math.min(1, entry.chance * (1 + input.dropRateBonus))) {
        rewards.push({ itemId: entry.itemId, kind: entry.kind, quantity: entry.quantity });
      }
    }
    rewards.push({ itemId: 'ember-chip', kind: 'material', quantity: 1 });
    if (input.quest.difficulty >= 2) rewards.push({ itemId: 'furnace-core', kind: 'material', quantity: 1 });
  }
  return summarizeRewards(rewards);
}
