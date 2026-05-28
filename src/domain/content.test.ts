import { describe, expect, it } from 'vitest';
import { initialCharacters, initialEnemies, initialQuests, initialWeapons, initialSummons } from './content';

describe('initial content', () => {
  it('contains one fire route with four starter characters', () => {
    expect(initialCharacters).toHaveLength(4);
    expect(initialCharacters.every((character) => character.element === 'fire')).toBe(true);
    expect(initialCharacters.every((character) => character.passives.length === 2)).toBe(true);
    expect(initialCharacters.every((character) => character.level === 1)).toBe(true);
    expect(initialCharacters.every((character) => character.maxLevel > character.level)).toBe(true);
    expect(
      initialCharacters.every((character) =>
        character.passives.every(
          (passive) => typeof passive.description === 'string' && Array.isArray(passive.modifiers),
        ),
      ),
    ).toBe(true);
  });

  it('contains farmable fire grid weapons and one wind enemy route', () => {
    expect(initialWeapons.some((weapon) => weapon.source === 'farmable')).toBe(true);
    expect(initialSummons.some((summon) => summon.aura.target === 'magna')).toBe(true);
    expect(initialEnemies.every((enemy) => enemy.element === 'wind')).toBe(true);
    expect(initialQuests.every((quest) => quest.element === 'wind')).toBe(true);
    expect(initialQuests.every((quest) => quest.runDurationMs >= 5 * 60_000)).toBe(true);
    expect(initialQuests.every((quest) => quest.runDurationMs <= 10 * 60_000)).toBe(true);
  });

  it('includes labels on every content modifier', () => {
    const characterModifiers = initialCharacters.flatMap((character) =>
      character.passives.flatMap((passive) => passive.modifiers),
    );
    const weaponModifiers = initialWeapons.flatMap((weapon) =>
      weapon.skills.flatMap((skill) => skill.modifiers),
    );

    expect([...characterModifiers, ...weaponModifiers].every((modifier) => typeof modifier.label === 'string')).toBe(
      true,
    );
  });

  it('uses planned weapon skill and summon progression fields', () => {
    expect(
      initialWeapons.every((weapon) =>
        weapon.skills.every((skill) => typeof skill.level === 'number' && Array.isArray(skill.modifiers)),
      ),
    ).toBe(true);
    expect(initialSummons.every((summon) => summon.level === 1)).toBe(true);
    expect(initialSummons.every((summon) => summon.maxLevel > summon.level)).toBe(true);
  });

  it('uses planned quest reward tables', () => {
    const allRewards = initialQuests.flatMap((quest) => [...quest.firstClearRewards, ...quest.dropTable]);

    expect(initialQuests.every((quest) => Array.isArray(quest.firstClearRewards))).toBe(true);
    expect(initialQuests.every((quest) => Array.isArray(quest.dropTable))).toBe(true);
    expect(
      allRewards.every(
        (reward) =>
          typeof reward.kind === 'string' &&
          typeof reward.quantity === 'number' &&
          typeof reward.chance === 'number',
      ),
    ).toBe(true);
  });
});
