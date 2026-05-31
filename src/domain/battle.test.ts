import { describe, expect, it } from 'vitest';
import { initialCharacters, initialEnemies, initialSummons, initialWeapons } from './content';
import { simulateBattle } from './battle';
import type { Character, Enemy, PartyLoadout, Summon, Weapon } from './types';

const baseLoadout = {
  characterIds: initialCharacters.map((character) => character.id),
  weaponGrid: {
    mainWeaponId: initialWeapons[0].id,
    weaponIds: initialWeapons.map((weapon) => weapon.id),
  },
  mainSummonId: initialSummons[0].id,
  summonIds: initialSummons.map((summon) => summon.id),
};

const testEnemy: Enemy = {
  id: 'enemy-test',
  name: 'Training Dummy',
  element: 'wind',
  stats: { hp: 50_000, atk: 0, defense: 100 },
  normalAttackDamage: 0,
  assetKey: 'enemy/test'
};

const testWeapon: Weapon = {
  id: 'weapon-test',
  name: 'Practice Blade',
  element: 'fire',
  rarity: 'SSR',
  source: 'story',
  level: 1,
  maxLevel: 100,
  stats: { hp: 0, atk: 0, defense: 0 },
  assetKey: 'weapon/test',
  skills: []
};

const testSummon: Summon = {
  id: 'summon-test',
  name: 'Practice Aura',
  element: 'fire',
  rarity: 'SSR',
  level: 1,
  maxLevel: 100,
  stats: { hp: 0, atk: 0, defense: 0 },
  aura: { label: 'No aura', target: 'normal', boost: 0 },
  assetKey: 'summon/test'
};

function makeCharacter(overrides: Partial<Character> & Pick<Character, 'id' | 'name'>): Character {
  return {
    id: overrides.id,
    name: overrides.name,
    element: 'fire',
    rarity: 'SSR',
    level: 1,
    maxLevel: 80,
    stats: { hp: 1_000, atk: 800, defense: 100 },
    assetKey: `character/${overrides.id}`,
    passives: [
      { id: `${overrides.id}-passive-a`, name: 'Passive A', description: '', modifiers: [] },
      { id: `${overrides.id}-passive-b`, name: 'Passive B', description: '', modifiers: [] }
    ],
    chargeAttack: { id: `${overrides.id}-ca`, name: 'Charge Attack', multiplier: 10, chargeCost: 100, cap: 100_000 },
    ...overrides
  };
}

function makeLoadout(characters: Character[], weapons: Weapon[] = [testWeapon]): PartyLoadout {
  return {
    characterIds: characters.map((character) => character.id),
    weaponGrid: {
      mainWeaponId: weapons[0].id,
      weaponIds: weapons.map((weapon) => weapon.id),
    },
    mainSummonId: testSummon.id,
    summonIds: [testSummon.id],
  };
}

function firstChargeDamage(result: ReturnType<typeof simulateBattle>, actor: string) {
  return result.turns.flatMap((turn) => turn.events).find((event) => event.actor === actor && event.kind === 'chargeAttack')?.damage;
}

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

  it('throws an internal error when the safety turn guard is exceeded', () => {
    expect(() =>
      simulateBattle({
        characters: [makeCharacter({ id: 'guard-attacker', name: 'Guard Attacker' })],
        weapons: [testWeapon],
        summons: [testSummon],
        enemy: { ...testEnemy, stats: { ...testEnemy.stats, hp: 1_000_000_000_000 } },
        loadout: makeLoadout([makeCharacter({ id: 'guard-attacker', name: 'Guard Attacker' })]),
        random: () => 0.99
      })
    ).toThrow('Battle simulation exceeded safety turn limit');
  });

  it('does not expose negative final party hp', () => {
    const result = simulateBattle({
      characters: initialCharacters,
      weapons: initialWeapons,
      summons: initialSummons,
      enemy: { ...initialEnemies[2], normalAttackDamage: 20_000 },
      loadout: baseLoadout,
      random: () => 0.99
    });

    expect(Object.values(result.finalPartyHp).every((hp) => hp >= 0)).toBe(true);
  });

  it('keeps self-only charge gain on the owning character', () => {
    const leya = initialCharacters[0];
    const caro = initialCharacters[1];
    const result = simulateBattle({
      characters: [leya, caro],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: testEnemy,
      loadout: makeLoadout([leya, caro]),
      random: () => 0.99
    });
    const firstTurnAttacks = result.turns[0].events.filter((event) => event.kind === 'normalAttack');
    const leyaAttack = firstTurnAttacks.find((event) => event.actor === leya.name);
    const caroAttack = firstTurnAttacks.find((event) => event.actor === caro.name);

    expect(leyaAttack?.chargeGain).toBeGreaterThan(caroAttack?.chargeGain ?? 0);
    expect(caroAttack?.chargeGain).toBe(10);
  });

  it('applies party-wide double attack passives to non-owner characters', () => {
    const attacker = makeCharacter({ id: 'party-attacker', name: 'Party Attacker' });
    const supporter = makeCharacter({
      id: 'party-da-supporter',
      name: 'Party DA Supporter',
      passives: [
        {
          id: 'party-da',
          name: '全队 DA',
          description: '全队 double attack',
          modifiers: [{ id: 'party-da-mod', label: '全队 DA +100%', type: 'doubleAttackRate', value: 1, source: 'character' }]
        },
        { id: 'party-da-empty', name: 'Empty', description: '', modifiers: [] }
      ]
    });
    const result = simulateBattle({
      characters: [attacker, supporter],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: testEnemy,
      loadout: makeLoadout([attacker, supporter]),
      random: () => 0.99
    });
    const attackerAttack = result.turns[0].events.find((event) => event.actor === attacker.name && event.kind === 'normalAttack');

    expect(attackerAttack?.hitCount).toBe(2);
  });

  it('applies party hp modifiers and shared equipment hp to survivability', () => {
    const attacker = makeCharacter({ id: 'hp-attacker', name: 'HP Attacker', stats: { hp: 1_000, atk: 50_000, defense: 100 } });
    const hpSupporter = makeCharacter({
      id: 'hp-supporter',
      name: 'HP Supporter',
      stats: { hp: 1_000, atk: 50_000, defense: 100 },
      passives: [
        {
          id: 'party-hp',
          name: '全队 HP',
          description: '全队 hp',
          modifiers: [{ id: 'party-hp-mod', label: '全队 HP +100%', type: 'hp', value: 1, source: 'character' }]
        },
        { id: 'party-hp-empty', name: 'Empty', description: '', modifiers: [] }
      ]
    });
    const hpWeapon: Weapon = { ...testWeapon, stats: { hp: 1_000, atk: 0, defense: 0 } };
    const damagingEnemy = { ...testEnemy, normalAttackDamage: 1_800, stats: { ...testEnemy.stats, hp: 120_000 } };
    const baseline = simulateBattle({
      characters: [attacker],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: damagingEnemy,
      loadout: makeLoadout([attacker]),
      random: () => 0.99
    });
    const boosted = simulateBattle({
      characters: [attacker, hpSupporter],
      weapons: [hpWeapon],
      summons: [testSummon],
      enemy: damagingEnemy,
      loadout: makeLoadout([attacker, hpSupporter], [hpWeapon]),
      random: () => 0.99
    });

    expect(baseline.outcome).toBe('loss');
    expect(boosted.turns.length).toBeGreaterThan(baseline.turns.length);
  });

  it('applies shared summon hp to survivability', () => {
    const attacker = makeCharacter({ id: 'summon-hp-attacker', name: 'Summon HP Attacker', stats: { hp: 1_000, atk: 10, defense: 100 } });
    const hpSummon: Summon = { ...testSummon, stats: { hp: 1_000, atk: 0, defense: 0 } };
    const damagingEnemy = { ...testEnemy, normalAttackDamage: 1_200, stats: { ...testEnemy.stats, hp: 120_000 } };
    const baseline = simulateBattle({
      characters: [attacker],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: damagingEnemy,
      loadout: makeLoadout([attacker]),
      random: () => 0.99
    });
    const boosted = simulateBattle({
      characters: [attacker],
      weapons: [testWeapon],
      summons: [hpSummon],
      enemy: damagingEnemy,
      loadout: makeLoadout([attacker]),
      random: () => 0.99
    });

    expect(baseline.outcome).toBe('loss');
    expect(boosted.outcome).toBe('loss');
    expect(boosted.turns.length).toBeGreaterThan(baseline.turns.length);
  });

  it('raises charge attack damage with charge damage modifiers', () => {
    const attacker = makeCharacter({
      id: 'charge-damage-attacker',
      name: 'Charge Damage Attacker',
      stats: { hp: 1_000, atk: 1_000, defense: 100 },
      chargeAttack: { id: 'charge-damage-ca', name: 'Charge Damage', multiplier: 1, chargeCost: 70, cap: 100_000 }
    });
    const boostedAttacker = makeCharacter({
      ...attacker,
      passives: [
        {
          id: 'charge-damage-passive',
          name: 'Charge Damage Passive',
          description: '',
          modifiers: [{ id: 'charge-damage-mod', label: 'Charge damage +100%', type: 'chargeDamage', value: 1, source: 'character' }]
        },
        { id: 'charge-damage-empty', name: 'Empty', description: '', modifiers: [] }
      ]
    });
    const baseline = simulateBattle({
      characters: [attacker],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: testEnemy,
      loadout: makeLoadout([attacker]),
      random: () => 0.99
    });
    const boosted = simulateBattle({
      characters: [boostedAttacker],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: testEnemy,
      loadout: makeLoadout([boostedAttacker]),
      random: () => 0.99
    });

    expect(firstChargeDamage(baseline, attacker.name)).toBe(1_500);
    expect(firstChargeDamage(boosted, boostedAttacker.name)).toBe(3_000);
  });

  it('raises charge attack damage cap with charge cap modifiers', () => {
    const cappedAttacker = makeCharacter({
      id: 'capped-attacker',
      name: 'Capped Attacker',
      stats: { hp: 1_000, atk: 100_000, defense: 100 },
      chargeAttack: { id: 'capped-ca', name: 'Capped Charge', multiplier: 10, chargeCost: 70, cap: 1_000 }
    });
    const capSupporter = makeCharacter({
      id: 'cap-supporter',
      name: 'Cap Supporter',
      chargeAttack: { id: 'cap-supporter-ca', name: 'Support Charge', multiplier: 1, chargeCost: 200, cap: 1 },
      passives: [
        {
          id: 'party-cap',
          name: '全队奥义上限',
          description: '全队 charge cap',
          modifiers: [{ id: 'party-cap-mod', label: '全队奥义上限 +100%', type: 'chargeCap', value: 1, source: 'character' }]
        },
        { id: 'party-cap-empty', name: 'Empty', description: '', modifiers: [] }
      ]
    });
    const baseline = simulateBattle({
      characters: [cappedAttacker],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: testEnemy,
      loadout: makeLoadout([cappedAttacker]),
      random: () => 0.99
    });
    const boosted = simulateBattle({
      characters: [cappedAttacker, capSupporter],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: testEnemy,
      loadout: makeLoadout([cappedAttacker, capSupporter]),
      random: () => 0.99
    });
    const baselineDamage = baseline.turns[0].events.find((event) => event.actor === cappedAttacker.name && event.kind === 'chargeAttack')?.damage;
    const boostedDamage = boosted.turns[0].events.find((event) => event.actor === cappedAttacker.name && event.kind === 'chargeAttack')?.damage;

    expect(baselineDamage).toBe(1_000);
    expect(boostedDamage).toBe(1_500);
  });

  it('does not let generic damage cap modifiers raise charge attack caps', () => {
    const cappedAttacker = makeCharacter({
      id: 'damage-cap-attacker',
      name: 'Damage Cap Attacker',
      stats: { hp: 1_000, atk: 100_000, defense: 100 },
      chargeAttack: { id: 'damage-cap-ca', name: 'Damage Cap Charge', multiplier: 10, chargeCost: 70, cap: 1_000 },
      passives: [
        {
          id: 'damage-cap-passive',
          name: 'Damage Cap Passive',
          description: '',
          modifiers: [{ id: 'damage-cap-mod', label: 'Damage cap +100%', type: 'damageCap', value: 1, source: 'character' }]
        },
        { id: 'damage-cap-empty', name: 'Empty', description: '', modifiers: [] }
      ]
    });
    const baselineAttacker = makeCharacter({
      ...cappedAttacker,
      passives: [
        { id: 'damage-cap-baseline-a', name: 'Empty A', description: '', modifiers: [] },
        { id: 'damage-cap-baseline-b', name: 'Empty B', description: '', modifiers: [] }
      ]
    });
    const baseline = simulateBattle({
      characters: [baselineAttacker],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: testEnemy,
      loadout: makeLoadout([baselineAttacker]),
      random: () => 0.99
    });
    const boosted = simulateBattle({
      characters: [cappedAttacker],
      weapons: [testWeapon],
      summons: [testSummon],
      enemy: testEnemy,
      loadout: makeLoadout([cappedAttacker]),
      random: () => 0.99
    });

    expect(firstChargeDamage(baseline, baselineAttacker.name)).toBe(1_000);
    expect(firstChargeDamage(boosted, cappedAttacker.name)).toBe(1_000);
  });

  it('shares equipped summon white stats across the party but only uses the main summon aura', () => {
    const attacker = makeCharacter({
      id: 'summon-grid-attacker',
      name: 'Summon Grid Attacker',
      stats: { hp: 1_000, atk: 1_000, defense: 100 },
      chargeAttack: { id: 'summon-grid-ca', name: 'Summon Grid CA', multiplier: 1, chargeCost: 70, cap: 200_000 },
    });
    const magnaWeapon: Weapon = {
      ...testWeapon,
      id: 'summon-grid-weapon',
      skills: [
        {
          id: 'summon-grid-magna',
          name: 'Magna Attack',
          level: 1,
          modifiers: [{ id: 'summon-grid-magna-mod', label: 'Magna +100%', type: 'attack', value: 1, category: 'magna', source: 'weapon' }],
        },
      ],
    };
    const mainSummon: Summon = {
      ...testSummon,
      id: 'summon-grid-main',
      aura: { label: 'Magna boost', target: 'magna', boost: 1 },
      stats: { hp: 0, atk: 0, defense: 0 },
    };
    const supportSummon: Summon = {
      ...testSummon,
      id: 'summon-grid-support',
      aura: { label: 'Normal boost', target: 'normal', boost: 1 },
      stats: { hp: 0, atk: 900, defense: 0 },
    };
    const boosted = simulateBattle({
      characters: [attacker],
      weapons: [magnaWeapon],
      summons: [mainSummon, supportSummon],
      enemy: testEnemy,
      loadout: {
        characterIds: [attacker.id],
        weaponGrid: { mainWeaponId: magnaWeapon.id, weaponIds: [magnaWeapon.id] },
        mainSummonId: mainSummon.id,
        summonIds: [mainSummon.id, supportSummon.id],
      },
      random: () => 0.99,
    });
    const withoutSupportStat = simulateBattle({
      characters: [attacker],
      weapons: [magnaWeapon],
      summons: [mainSummon],
      enemy: testEnemy,
      loadout: {
        characterIds: [attacker.id],
        weaponGrid: { mainWeaponId: magnaWeapon.id, weaponIds: [magnaWeapon.id] },
        mainSummonId: mainSummon.id,
        summonIds: [mainSummon.id],
      },
      random: () => 0.99,
    });
    const withSupportAsMain = simulateBattle({
      characters: [attacker],
      weapons: [magnaWeapon],
      summons: [mainSummon, supportSummon],
      enemy: testEnemy,
      loadout: {
        characterIds: [attacker.id],
        weaponGrid: { mainWeaponId: magnaWeapon.id, weaponIds: [magnaWeapon.id] },
        mainSummonId: supportSummon.id,
        summonIds: [mainSummon.id, supportSummon.id],
      },
      random: () => 0.99,
    });

    expect(firstChargeDamage(boosted, attacker.name)).toBe(8_550);
    expect(firstChargeDamage(withoutSupportStat, attacker.name)).toBe(4_500);
    expect(firstChargeDamage(withSupportAsMain, attacker.name)).toBe(5_700);
  });
});
