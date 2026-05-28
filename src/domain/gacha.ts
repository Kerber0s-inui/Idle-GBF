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
  const ticketCost = input.count === 1 ? 1 : 10;
  const crystalCost = input.count === 1 ? 300 : 3000;
  let remainingTickets = input.tickets;
  let remainingCrystals = input.crystals;
  if (remainingTickets >= ticketCost) remainingTickets -= ticketCost;
  else if (remainingCrystals >= crystalCost) remainingCrystals -= crystalCost;
  else throw new Error('抽卡资源不足');

  const totalWeight = input.pool.items.reduce((total, item) => total + item.weight, 0);
  const results: GachaPoolItem[] = [];
  for (let i = 0; i < input.count; i += 1) {
    let roll = input.random() * totalWeight;
    const picked = input.pool.items.find((item) => {
      roll -= item.weight;
      return roll <= 0;
    });
    results.push(picked ?? input.pool.items[input.pool.items.length - 1]);
  }
  return { results, remainingCrystals, remainingTickets };
}
