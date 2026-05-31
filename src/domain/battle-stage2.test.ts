import { describe, expect, it } from 'vitest';
import { initialCharacters, initialSummons, initialWeapons } from './content';
import { simulateBattle } from './battle';
import type { Enemy, PartyLoadout } from './types';

const loadout: PartyLoadout = {
  characterIds: initialCharacters.map((character) => character.id),
  weaponGrid: {
    mainWeaponId: initialWeapons[0].id,
    weaponIds: initialWeapons.map((weapon) => weapon.id),
  },
  mainSummonId: initialSummons[0].id,
  summonIds: initialSummons.map((summon) => summon.id),
};

function makeBoss(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: 'enemy-stage2-boss',
    name: '风蚀特动核',
    element: 'wind',
    stats: { hp: 90_000, atk: 900, defense: 100 },
    normalAttackDamage: 300,
    assetKey: 'enemy/stage2-boss',
    chargeMax: 2,
    specialActions: [
      {
        id: 'hp-50',
        name: '裂风阈震',
        trigger: { kind: 'hpThreshold', threshold: 0.5 },
        target: { kind: 'all' },
        damageMultiplier: 1.2,
      },
      {
        id: 'charge-full',
        name: '满豆风压',
        trigger: { kind: 'chargeFull' },
        target: { kind: 'single' },
        damageMultiplier: 1,
      },
    ],
    ...overrides,
  };
}

describe('stage 2 battle simulation', () => {
  it('emits structured player and enemy action logs with expandable snapshots', () => {
    const result = simulateBattle({
      characters: initialCharacters,
      weapons: initialWeapons,
      summons: initialSummons,
      enemy: makeBoss({ stats: { hp: 20_000, atk: 900, defense: 100 } }),
      loadout,
      random: () => 0,
    });

    const playerAction = result.turns.flatMap((turn) => turn.events).find((event) => event.phase === 'player');
    const enemyAction = result.turns.flatMap((turn) => turn.events).find((event) => event.phase === 'enemy');

    expect(playerAction?.message).toMatch(/对.+造成了 \d+ 伤害/);
    expect(playerAction?.snapshot?.actor.hp).toBeGreaterThan(0);
    expect(playerAction?.snapshot?.actor.charge).toBeGreaterThanOrEqual(0);
    expect(enemyAction?.message).toMatch(/对.+造成了 \d+ 伤害/);
    expect(enemyAction?.snapshot?.boss.hp).toBeGreaterThan(0);
  });

  it('prioritizes hp threshold specials over charge specials and resets boss charge', () => {
    const result = simulateBattle({
      characters: initialCharacters,
      weapons: initialWeapons,
      summons: initialSummons,
      enemy: makeBoss({
        stats: { hp: 45_000, atk: 900, defense: 100 },
        chargeMax: 1,
        specialActions: [
          {
            id: 'hp-95',
            name: '裂风阈震',
            trigger: { kind: 'hpThreshold', threshold: 0.95 },
            target: { kind: 'all' },
            damageMultiplier: 1.2,
          },
          {
            id: 'charge-full',
            name: '满豆风压',
            trigger: { kind: 'chargeFull' },
            target: { kind: 'single' },
            damageMultiplier: 1,
          },
        ],
      }),
      loadout,
      random: () => 0,
    });

    const specialEvents = result.turns.flatMap((turn) => turn.events).filter((event) => event.kind === 'specialAttack');

    expect(specialEvents[0].label).toBe('裂风阈震');
    expect(specialEvents[0].message).toContain('发动特动');
    expect(specialEvents[0].snapshot?.boss.charge).toBe(0);
  });

  it('records fallen characters at the end of the turn', () => {
    const result = simulateBattle({
      characters: initialCharacters,
      weapons: initialWeapons,
      summons: initialSummons,
      enemy: makeBoss({ normalAttackDamage: 50_000, stats: { hp: 120_000, atk: 50_000, defense: 100 } }),
      loadout,
      random: () => 0,
    });

    const fallenEvent = result.turns.flatMap((turn) => turn.events).find((event) => event.kind === 'fallen');

    expect(fallenEvent?.phase).toBe('system');
    expect(fallenEvent?.message).toMatch(/倒下了/);
  });
});
