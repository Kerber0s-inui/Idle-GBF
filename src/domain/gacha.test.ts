import { describe, expect, it } from 'vitest';
import { initialCharacters, initialSummons, initialWeapons } from './content';
import { createInitialGachaPool, pullGacha } from './gacha';

describe('gacha', () => {
  it('spends crystals and returns ten results', () => {
    const pool = createInitialGachaPool(initialCharacters, initialWeapons, initialSummons);
    const result = pullGacha({ pool, crystals: 3000, tickets: 0, count: 10, random: () => 0.01 });
    expect(result.remainingCrystals).toBe(0);
    expect(result.results).toHaveLength(10);
  });

  it('rejects pulls without enough resources', () => {
    const pool = createInitialGachaPool(initialCharacters, initialWeapons, initialSummons);
    expect(() => pullGacha({ pool, crystals: 100, tickets: 0, count: 10, random: () => 0.5 })).toThrow('抽卡资源不足');
  });
});
