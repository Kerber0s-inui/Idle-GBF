import type { Character, Summon, Weapon } from './types';

export interface GachaPoolItem {
  id: string;
  kind: 'character' | 'weapon' | 'summon';
  rarity: 'R' | 'SR' | 'SSR';
  weight: number;
}

export interface GachaPool {
  id: string;
  name: string;
  items: GachaPoolItem[];
}

function normalizeRandom(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

function validatePool(pool: GachaPool) {
  if (pool.items.length === 0) throw new Error('卡池为空');
  const totalWeight = pool.items.reduce((total, item) => {
    if (!Number.isFinite(item.weight) || item.weight <= 0) throw new Error('卡池权重无效');
    return total + item.weight;
  }, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) throw new Error('卡池权重无效');
  return totalWeight;
}

export function createInitialGachaPool(characters: Character[], weapons: Weapon[], summons: Summon[]): GachaPool {
  return {
    id: 'standard-furnace-pool',
    name: '星炉常驻池',
    items: [
      ...characters.map((character) => ({
        id: character.id,
        kind: 'character' as const,
        rarity: character.rarity,
        weight: character.rarity === 'SSR' ? 3 : 12,
      })),
      ...weapons.map((weapon) => ({
        id: weapon.id,
        kind: 'weapon' as const,
        rarity: weapon.rarity,
        weight: weapon.rarity === 'SSR' ? 4 : 15,
      })),
      ...summons.map((summon) => ({
        id: summon.id,
        kind: 'summon' as const,
        rarity: summon.rarity,
        weight: summon.rarity === 'SSR' ? 2 : 10,
      })),
    ],
  };
}

export function pullGacha(input: { pool: GachaPool; crystals: number; tickets: number; count: 1 | 10; random: () => number }) {
  const totalWeight = validatePool(input.pool);
  let remainingTickets = input.tickets;
  let remainingCrystals = input.crystals;
  for (let pull = 0; pull < input.count; pull += 1) {
    if (remainingTickets > 0) remainingTickets -= 1;
    else if (remainingCrystals >= 300) remainingCrystals -= 300;
    else throw new Error('抽卡资源不足');
  }

  const results: GachaPoolItem[] = [];
  for (let i = 0; i < input.count; i += 1) {
    let roll = normalizeRandom(input.random()) * totalWeight;
    const picked = input.pool.items.find((item) => {
      roll -= item.weight;
      return roll <= 0;
    });
    results.push(picked ?? input.pool.items[input.pool.items.length - 1]);
  }
  return { results, remainingCrystals, remainingTickets };
}
