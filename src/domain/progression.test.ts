import { describe, expect, it } from 'vitest';
import { initialCharacters, initialSummons, initialWeapons } from './content';
import { applyCharacterProgression, applySummonProgression, applyWeaponProgression } from './progression';

describe('progression projection', () => {
  it('applies character level growth to stats', () => {
    const progressed = applyCharacterProgression(initialCharacters[0], {
      level: 11,
      exp: 10_000,
      uncap: 0,
      levelCap: 80,
    });

    expect(progressed.level).toBe(11);
    expect(progressed.stats.atk).toBeGreaterThan(initialCharacters[0].stats.atk);
    expect(progressed.stats.hp).toBeGreaterThan(initialCharacters[0].stats.hp);
  });

  it('applies weapon level and skill growth to stats and modifiers', () => {
    const progressed = applyWeaponProgression(initialWeapons[1], {
      level: 21,
      exp: 20_000,
      uncap: 0,
      levelCap: 40,
      skillLevel: 5,
    });

    expect(progressed.level).toBe(21);
    expect(progressed.stats.atk).toBeGreaterThan(initialWeapons[1].stats.atk);
    expect(progressed.skills[0]?.level).toBe(5);
    expect(progressed.skills[0]?.modifiers[0]?.value).toBeCloseTo(0.11);
    expect(progressed.skills[0]?.modifiers[0]?.label).toContain('+11%');
  });

  it('applies summon level growth to stats', () => {
    const progressed = applySummonProgression(initialSummons[0], {
      level: 16,
      exp: 15_000,
      uncap: 0,
      levelCap: 40,
    });

    expect(progressed.level).toBe(16);
    expect(progressed.stats.atk).toBeGreaterThan(initialSummons[0].stats.atk);
    expect(progressed.stats.hp).toBeGreaterThan(initialSummons[0].stats.hp);
  });
});
