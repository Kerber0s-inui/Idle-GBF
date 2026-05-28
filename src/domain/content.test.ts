import { describe, expect, it } from 'vitest';
import { initialCharacters, initialEnemies, initialQuests, initialWeapons, initialSummons } from './content';

describe('initial content', () => {
  it('contains one fire route with four starter characters', () => {
    expect(initialCharacters).toHaveLength(4);
    expect(initialCharacters.every((character) => character.element === 'fire')).toBe(true);
    expect(initialCharacters.every((character) => character.passives.length === 2)).toBe(true);
  });

  it('contains farmable fire grid weapons and one wind enemy route', () => {
    expect(initialWeapons.some((weapon) => weapon.source === 'farmable')).toBe(true);
    expect(initialSummons.some((summon) => summon.aura.target === 'magna')).toBe(true);
    expect(initialEnemies.every((enemy) => enemy.element === 'wind')).toBe(true);
    expect(initialQuests.every((quest) => quest.element === 'wind')).toBe(true);
    expect(initialQuests.every((quest) => quest.runDurationMs >= 5 * 60_000)).toBe(true);
    expect(initialQuests.every((quest) => quest.runDurationMs <= 10 * 60_000)).toBe(true);
  });
});
