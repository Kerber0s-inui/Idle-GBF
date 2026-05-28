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

  it('spends tickets before crystals when resources are mixed', () => {
    const pool = createInitialGachaPool(initialCharacters, initialWeapons, initialSummons);
    const result = pullGacha({ pool, crystals: 300, tickets: 9, count: 10, random: () => 0.01 });
    expect(result.remainingTickets).toBe(0);
    expect(result.remainingCrystals).toBe(0);
    expect(result.results).toHaveLength(10);
  });

  it('rejects empty pools before picking a result', () => {
    expect(() =>
      pullGacha({
        pool: { id: 'empty', name: 'empty', items: [] },
        crystals: 300,
        tickets: 0,
        count: 1,
        random: () => 0.5,
      }),
    ).toThrow('卡池为空');
  });

  it('rejects invalid pool weights before picking a result', () => {
    const pool = createInitialGachaPool(initialCharacters, initialWeapons, initialSummons);
    expect(() =>
      pullGacha({
        pool: { ...pool, items: [{ ...pool.items[0], weight: Number.POSITIVE_INFINITY }] },
        crystals: 300,
        tickets: 0,
        count: 1,
        random: () => 0.5,
      }),
    ).toThrow('卡池权重无效');
  });

  it('clamps invalid random values to a deterministic pool result', () => {
    const pool = createInitialGachaPool(initialCharacters, initialWeapons, initialSummons);
    const result = pullGacha({ pool, crystals: 300, tickets: 0, count: 1, random: () => Number.POSITIVE_INFINITY });
    expect(result.results).toEqual([pool.items[0]]);
  });

  it('rejects pulls without enough resources', () => {
    const pool = createInitialGachaPool(initialCharacters, initialWeapons, initialSummons);
    expect(() => pullGacha({ pool, crystals: 100, tickets: 0, count: 10, random: () => 0.5 })).toThrow('抽卡资源不足');
  });
});
