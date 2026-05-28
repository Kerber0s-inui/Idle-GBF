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

  it('does not grant zero chance drops', () => {
    const quest = {
      ...initialQuests[0],
      dropTable: [{ itemId: 'zero-chance-drop', kind: 'material' as const, quantity: 1, chance: 0 }],
    };
    const rewards = rollRewards({ quest, runCount: 1, includeFirstClear: false, dropRateBonus: 0, random: () => 0 });
    expect(rewards.some((reward) => reward.itemId === 'zero-chance-drop')).toBe(false);
  });

  it('aggregates reward quantities by item and kind', () => {
    const summary = summarizeRewards([
      { itemId: 'crystal', kind: 'currency', quantity: 100 },
      { itemId: 'crystal', kind: 'currency', quantity: 200 },
    ]);
    expect(summary).toEqual([{ itemId: 'crystal', kind: 'currency', quantity: 300 }]);
  });
});
