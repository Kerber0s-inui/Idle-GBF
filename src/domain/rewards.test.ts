import { describe, expect, it } from 'vitest';
import { initialQuests } from './content';
import { rollRewards, summarizeRewards } from './rewards';

describe('rewards', () => {
  it('always grants first-clear rewards and rolls farming drops', () => {
    const quest = initialQuests[0];
    const rewards = rollRewards({ quest, runCount: 10, includeFirstClear: true, dropRateBonus: 0, random: () => 0 });
    expect(rewards.some((reward) => reward.itemId === 'crystal' && reward.quantity === 300)).toBe(true);
    expect(rewards.some((reward) => reward.itemId === 'weapon-furnace-grid-blade')).toBe(true);
  });

  it('aggregates reward quantities by item and kind', () => {
    const summary = summarizeRewards([
      { itemId: 'crystal', kind: 'currency', quantity: 100 },
      { itemId: 'crystal', kind: 'currency', quantity: 200 },
    ]);
    expect(summary).toEqual([{ itemId: 'crystal', kind: 'currency', quantity: 300 }]);
  });
});
