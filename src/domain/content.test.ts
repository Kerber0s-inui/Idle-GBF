import { describe, expect, it } from 'vitest';
import { initialCharacters, initialEnemies, initialQuests, initialWeapons, initialSummons } from './content';

describe('initial content', () => {
  const isFiniteInteger = (value: number) => Number.isFinite(value) && Number.isInteger(value);
  const isNonNegativeFinite = (value: number) => Number.isFinite(value) && value >= 0;
  const allModifiers = [
    ...initialCharacters.flatMap((character) => character.passives.flatMap((passive) => passive.modifiers)),
    ...initialWeapons.flatMap((weapon) => weapon.skills.flatMap((skill) => skill.modifiers)),
  ];
  const allRewards = initialQuests.flatMap((quest) => [...quest.firstClearRewards, ...quest.dropTable]);

  it('contains one fire route with four starter characters', () => {
    const firstCharacterPassives = initialCharacters[0].passives;

    expect(initialCharacters).toHaveLength(4);
    expect(firstCharacterPassives[0].id).toBe('passive-leya-solar-oath');
    expect(firstCharacterPassives[1].id).toBe('passive-leya-charge-loop');
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
    expect(initialWeapons).toHaveLength(2);
    expect(initialSummons).toHaveLength(2);
    expect(initialEnemies).toHaveLength(3);
    expect(initialQuests).toHaveLength(3);
    expect(initialWeapons.some((weapon) => weapon.source === 'farmable')).toBe(true);
    expect(initialSummons.some((summon) => summon.aura.target === 'magna')).toBe(true);
    expect(initialEnemies.every((enemy) => enemy.element === 'wind')).toBe(true);
    expect(initialQuests.every((quest) => quest.element === 'wind')).toBe(true);
    expect(initialQuests.every((quest) => quest.runDurationMs >= 5 * 60_000)).toBe(true);
    expect(initialQuests.every((quest) => quest.runDurationMs <= 10 * 60_000)).toBe(true);
  });

  it('includes labels on every content modifier', () => {
    expect(allModifiers.every((modifier) => typeof modifier.label === 'string')).toBe(true);
    expect(allModifiers.every((modifier) => modifier.label.trim().length > 0)).toBe(true);
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
    const questMain2GachaTicket = initialQuests
      .find((quest) => quest.id === 'quest-main-2')
      ?.firstClearRewards.find((reward) => reward.itemId === 'gacha-ticket');
    const allowedRewardKinds = new Set(['material', 'weapon', 'summon', 'currency']);

    expect(initialQuests.every((quest) => Array.isArray(quest.firstClearRewards))).toBe(true);
    expect(initialQuests.every((quest) => Array.isArray(quest.dropTable))).toBe(true);
    expect(questMain2GachaTicket?.kind).toBe('currency');
    expect(allRewards.every((reward) => allowedRewardKinds.has(reward.kind))).toBe(true);
    expect(
      allRewards.every(
        (reward) =>
          typeof reward.kind === 'string' &&
          typeof reward.quantity === 'number' &&
          typeof reward.chance === 'number',
      ),
    ).toBe(true);
  });

  it('keeps quest references resolvable', () => {
    const enemyIds = new Set(initialEnemies.map((enemy) => enemy.id));
    const questIds = new Set(initialQuests.map((quest) => quest.id));
    const weaponIds = new Set(initialWeapons.map((weapon) => weapon.id));
    const summonIds = new Set(initialSummons.map((summon) => summon.id));
    const itemExists = (kind: string, itemId: string) =>
      (kind === 'weapon' && weaponIds.has(itemId)) ||
      (kind === 'summon' && summonIds.has(itemId)) ||
      kind === 'currency' ||
      kind === 'material';

    expect(initialQuests.every((quest) => enemyIds.has(quest.enemyId))).toBe(true);
    expect(
      initialQuests.every((quest) => quest.unlockAfterQuestId === undefined || questIds.has(quest.unlockAfterQuestId)),
    ).toBe(true);
    expect(
      initialQuests.every((quest) =>
        [...quest.firstClearRewards, ...quest.dropTable].every((reward) => itemExists(reward.kind, reward.itemId)),
      ),
    ).toBe(true);
  });

  it('keeps numeric content values within valid ranges', () => {
    const allStats = [
      ...initialCharacters.map((character) => character.stats),
      ...initialWeapons.map((weapon) => weapon.stats),
      ...initialSummons.map((summon) => summon.stats),
      ...initialEnemies.map((enemy) => enemy.stats),
    ];
    const leveledContent = [...initialCharacters, ...initialWeapons, ...initialSummons];

    expect(
      allRewards.every(
        (reward) =>
          isFiniteInteger(reward.quantity) &&
          reward.quantity > 0 &&
          Number.isFinite(reward.chance) &&
          reward.chance >= 0 &&
          reward.chance <= 1,
      ),
    ).toBe(true);
    expect(allStats.every((stats) => isNonNegativeFinite(stats.hp) && isNonNegativeFinite(stats.atk) && isNonNegativeFinite(stats.defense))).toBe(
      true,
    );
    expect(initialEnemies.every((enemy) => Number.isFinite(enemy.normalAttackDamage) && enemy.normalAttackDamage > 0)).toBe(
      true,
    );
    expect(
      leveledContent.every(
        (entry) =>
          isFiniteInteger(entry.level) &&
          isFiniteInteger(entry.maxLevel) &&
          entry.level >= 1 &&
          entry.level <= entry.maxLevel,
      ),
    ).toBe(true);
    expect(initialQuests.every((quest) => isFiniteInteger(quest.difficulty) && quest.difficulty > 0)).toBe(true);
    expect(initialQuests.every((quest) => isFiniteInteger(quest.runDurationMs) && quest.runDurationMs > 0)).toBe(true);
    expect(
      initialCharacters.every(
        (character) =>
          Number.isFinite(character.chargeAttack.multiplier) &&
          character.chargeAttack.multiplier > 0 &&
          Number.isFinite(character.chargeAttack.chargeCost) &&
          character.chargeAttack.chargeCost > 0 &&
          Number.isFinite(character.chargeAttack.cap) &&
          character.chargeAttack.cap > 0,
      ),
    ).toBe(true);
    expect(initialWeapons.every((weapon) => weapon.skills.every((skill) => isFiniteInteger(skill.level) && skill.level >= 1))).toBe(
      true,
    );
    expect(initialSummons.every((summon) => Number.isFinite(summon.aura.boost) && summon.aura.boost >= 0)).toBe(true);
    expect(allModifiers.every((modifier) => Number.isFinite(modifier.value))).toBe(true);
  });
});
