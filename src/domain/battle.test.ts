import { describe, expect, it } from 'vitest';
import { initialCharacters, initialEnemies, initialSummons, initialWeapons } from './content';
import { simulateBattle } from './battle';

const baseLoadout = {
  characterIds: initialCharacters.map((character) => character.id),
  weaponGrid: {
    mainWeaponId: initialWeapons[0].id,
    weaponIds: initialWeapons.map((weapon) => weapon.id)
  },
  mainSummonId: initialSummons[0].id,
  supportSummonId: initialSummons[1].id
};

describe('battle simulation', () => {
  it('resolves a first-clear battle with logs and charge attacks', () => {
    const result = simulateBattle({
      characters: initialCharacters,
      weapons: initialWeapons,
      summons: initialSummons,
      enemy: initialEnemies[0],
      loadout: baseLoadout,
      random: () => 0.01
    });

    expect(result.outcome).toBe('win');
    expect(result.turns.length).toBeGreaterThan(0);
    expect(result.turns.some((turn) => turn.events.some((event) => event.kind === 'chargeAttack'))).toBe(true);
  });

  it('can lose when enemy damage overwhelms the party', () => {
    const result = simulateBattle({
      characters: initialCharacters,
      weapons: initialWeapons,
      summons: initialSummons,
      enemy: { ...initialEnemies[2], normalAttackDamage: 20_000 },
      loadout: baseLoadout,
      random: () => 0.99
    });

    expect(result.outcome).toBe('loss');
    expect(result.summary).toBe('队伍被击败');
  });
});
