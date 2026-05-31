import { calculateAttackBreakdown, clampModifierCaps, sumModifiers } from './formula';
import type { Character, Modifier, Summon, Weapon } from './types';

export type BondRuleSummary = {
  id: string;
  name: string;
  requirementText: string;
  description: string;
  modifiers: Modifier[];
  isActive: (characters: Character[]) => boolean;
  progress: (characters: Character[]) => {
    current: number;
    target: number;
    missingText: string;
  };
};

export type EffectSourceGroup = {
  id: string;
  label: string;
  kind: 'bond' | 'weapon' | 'summon' | 'passive';
  entries: Array<{
    id: string;
    name: string;
    detail: string;
  }>;
};

export type EffectCapSummary = {
  id: string;
  label: string;
  current: number;
  cap: number;
  valueText: string;
};

export type PartyPreviewSummary = {
  totalAtk: number;
  totalHp: number;
  totalDefense: number;
  chargeGainModifier: number;
  doubleAttackRate: number;
  tripleAttackRate: number;
  dropRate: number;
  sweepEfficiency: number;
  normalBoost: number;
  magnaBoost: number;
  attackBreakdown: ReturnType<typeof calculateAttackBreakdown>;
  allModifiers: Modifier[];
  activeBondRules: BondRuleSummary[];
  effectGroups: EffectSourceGroup[];
  effectCaps: EffectCapSummary[];
};

function createModifier(input: Omit<Modifier, 'source'>): Modifier {
  return { ...input, source: 'character' };
}

export const BOND_RULES: BondRuleSummary[] = [
  {
    id: 'bond-ember-squad',
    name: '赤轨小队',
    requirementText: '至少 3 名赤轨角色',
    description: '奥义获得量 +20% / 奥义上限 +15%',
    modifiers: [
      createModifier({ id: 'bond-ember-charge-gain', label: '奥义获得量 +20%', type: 'chargeGain', value: 0.2 }),
      createModifier({ id: 'bond-ember-charge-cap', label: '奥义上限 +15%', type: 'chargeCap', value: 0.15 }),
    ],
    isActive: (characters) => characters.filter((character) => character.bondTags?.includes('赤轨')).length >= 3,
    progress: (characters) => ({
      current: characters.filter((character) => character.bondTags?.includes('赤轨')).length,
      target: 3,
      missingText: '还需要赤轨角色',
    }),
  },
  {
    id: 'bond-furnace-guard',
    name: '炉心防线',
    requirementText: '2 名炉心角色 + 1 名防御角色',
    description: 'HP +30% / 防御 +25%',
    modifiers: [
      createModifier({ id: 'bond-furnace-hp', label: 'HP +30%', type: 'hp', value: 0.3 }),
      createModifier({ id: 'bond-furnace-defense', label: '防御 +25%', type: 'defense', value: 0.25 }),
    ],
    isActive: (characters) =>
      characters.filter((character) => character.bondTags?.includes('炉心')).length >= 2 &&
      characters.some((character) => character.bondTags?.includes('防御')),
    progress: (characters) => {
      const furnaceCount = characters.filter((character) => character.bondTags?.includes('炉心')).length;
      const hasDefender = characters.some((character) => character.bondTags?.includes('防御'));
      return {
        current: Math.min(furnaceCount, 2) + (hasDefender ? 1 : 0),
        target: 3,
        missingText: hasDefender ? '还需要炉心角色' : '还需要防御角色',
      };
    },
  },
  {
    id: 'bond-cinder-salvage',
    name: '灰烬搜荒',
    requirementText: '至少 2 名灰烬角色',
    description: '掉落率 +15% / 扫荡耗时 -10%',
    modifiers: [
      createModifier({ id: 'bond-cinder-drop', label: '掉落率 +15%', type: 'dropRate', value: 0.15 }),
      createModifier({ id: 'bond-cinder-sweep', label: '扫荡耗时 -10%', type: 'sweepEfficiency', value: -0.1 }),
    ],
    isActive: (characters) => characters.filter((character) => character.bondTags?.includes('灰烬')).length >= 2,
    progress: (characters) => ({
      current: characters.filter((character) => character.bondTags?.includes('灰烬')).length,
      target: 2,
      missingText: '还需要灰烬角色',
    }),
  },
];

const EFFECT_CAP_RULES: Array<{
  id: string;
  label: string;
  type: Modifier['type'];
  cap: number;
}> = [
  { id: 'cap-hp', label: 'HP加成', type: 'hp', cap: 4 },
  { id: 'cap-defense', label: '防御加成', type: 'defense', cap: 1 },
  { id: 'cap-da', label: 'DA', type: 'doubleAttackRate', cap: 0.75 },
  { id: 'cap-ta', label: 'TA', type: 'tripleAttackRate', cap: 0.75 },
  { id: 'cap-normal-attack', label: '普攻上限', type: 'normalAttackCap', cap: 0.5 },
  { id: 'cap-charge', label: '奥义上限', type: 'chargeCap', cap: 0.5 },
  { id: 'cap-drop', label: '掉落率', type: 'dropRate', cap: 0.5 },
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function createElementAdvantageModifier(): Modifier {
  return {
    id: 'ui-elemental-advantage',
    label: '属性克制',
    type: 'attack',
    value: 0.5,
    category: 'elemental',
    source: 'summon',
  };
}

function getActiveBondRules(characters: Character[]) {
  return BOND_RULES.filter((rule) => rule.isActive(characters));
}

function buildWeaponEntries(weapons: Weapon[]) {
  return weapons
    .filter((weapon) => weapon.skills.length > 0)
    .map((weapon) => ({
      id: weapon.id,
      name: weapon.name,
      detail: weapon.skills.flatMap((skill) => skill.modifiers.map((modifier) => modifier.label)).join(' / '),
    }));
}

function buildPassiveEntries(characters: Character[]) {
  return characters.flatMap((character) =>
    character.passives
      .filter((passive) => passive.modifiers.length > 0)
      .map((passive) => ({
        id: `${character.id}-${passive.id}`,
        name: `${character.name}·${passive.name}`,
        detail: passive.modifiers.map((modifier) => modifier.label).join(' / '),
      })),
  );
}

function buildSummonEntries(mainSummon: Summon | undefined) {
  if (!mainSummon) return [];
  return [
    {
      id: mainSummon.id,
      name: mainSummon.name,
      detail: mainSummon.aura.label,
    },
  ];
}

function buildEffectGroups(input: {
  activeBondRules: BondRuleSummary[];
  characters: Character[];
  weapons: Weapon[];
  mainSummon: Summon | undefined;
}) : EffectSourceGroup[] {
  const groups: EffectSourceGroup[] = [];

  if (input.activeBondRules.length > 0) {
    groups.push({
      id: 'effects-bond',
      label: '羁绊',
      kind: 'bond',
      entries: input.activeBondRules.map((bond) => ({
        id: bond.id,
        name: bond.name,
        detail: bond.description,
      })),
    });
  }

  const weaponEntries = buildWeaponEntries(input.weapons);
  if (weaponEntries.length > 0) {
    groups.push({
      id: 'effects-weapon',
      label: '武器词条',
      kind: 'weapon',
      entries: weaponEntries,
    });
  }

  const summonEntries = buildSummonEntries(input.mainSummon);
  if (summonEntries.length > 0) {
    groups.push({
      id: 'effects-summon',
      label: '主召加护',
      kind: 'summon',
      entries: summonEntries,
    });
  }

  const passiveEntries = buildPassiveEntries(input.characters);
  if (passiveEntries.length > 0) {
    groups.push({
      id: 'effects-passive',
      label: '角色被动',
      kind: 'passive',
      entries: passiveEntries,
    });
  }

  return groups;
}

function buildEffectCaps(modifiers: Modifier[]) {
  return EFFECT_CAP_RULES.map((rule) => {
    const current = Math.max(0, sumModifiers(modifiers, rule.type));
    return {
      id: rule.id,
      label: rule.label,
      current,
      cap: rule.cap,
      valueText: `${percent(current)} / ${percent(rule.cap)}`,
    };
  });
}

export function getActiveBondModifiers(characters: Character[]) {
  return getActiveBondRules(characters).flatMap((rule) => rule.modifiers);
}

export function buildPartyPreviewSummary(input: {
  characters: Character[];
  weapons: Weapon[];
  summons: Summon[];
}): PartyPreviewSummary {
  const partySize = Math.max(1, input.characters.length);
  const mainSummon = input.summons[0];
  const activeBondRules = getActiveBondRules(input.characters);
  const bondModifiers = activeBondRules.flatMap((rule) => rule.modifiers);
  const weaponModifiers = input.weapons.flatMap((weapon) => weapon.skills.flatMap((skill) => skill.modifiers));
  const passiveModifiers = input.characters.flatMap((character) => character.passives.flatMap((passive) => passive.modifiers));
  const allModifiers = [...weaponModifiers, ...passiveModifiers, ...bondModifiers];
  const sharedWeaponAttack = input.weapons.reduce((total, weapon) => total + weapon.stats.atk, 0) / partySize;
  const sharedWeaponHp = input.weapons.reduce((total, weapon) => total + weapon.stats.hp, 0) / partySize;
  const sharedWeaponDefense = input.weapons.reduce((total, weapon) => total + weapon.stats.defense, 0) / partySize;
  const sharedSummonAttack = input.summons.reduce((total, summon) => total + summon.stats.atk, 0) / partySize;
  const sharedSummonHp = input.summons.reduce((total, summon) => total + summon.stats.hp, 0) / partySize;
  const sharedSummonDefense = input.summons.reduce((total, summon) => total + summon.stats.defense, 0) / partySize;
  const normalBoost = mainSummon?.aura.target === 'normal' ? mainSummon.aura.boost : 0;
  const magnaBoost = mainSummon?.aura.target === 'magna' ? mainSummon.aura.boost : 0;
  const totalAtk = Math.floor(
    input.characters.reduce((total, character) => total + character.stats.atk + sharedWeaponAttack + sharedSummonAttack, 0),
  );
  const totalHp = Math.floor(
    input.characters.reduce((total, character) => {
      const hpModifier = sumModifiers(allModifiers, 'hp');
      return total + (character.stats.hp + sharedWeaponHp + sharedSummonHp) * (1 + hpModifier);
    }, 0),
  );
  const totalDefense = Math.floor(
    input.characters.reduce((total, character) => {
      const defenseModifier = sumModifiers(allModifiers, 'defense');
      return total + (character.stats.defense + sharedWeaponDefense + sharedSummonDefense) * (1 + defenseModifier);
    }, 0),
  );
  const capped = clampModifierCaps({
    criticalRate: sumModifiers(allModifiers, 'criticalRate'),
    damageCap: sumModifiers(allModifiers, 'damageCap'),
    normalAttackCap: sumModifiers(allModifiers, 'normalAttackCap'),
    chargeCap: sumModifiers(allModifiers, 'chargeCap'),
    dropRate: sumModifiers(allModifiers, 'dropRate'),
    sweepEfficiency: sumModifiers(allModifiers, 'sweepEfficiency'),
    damageReduction: 0,
  });

  return {
    totalAtk,
    totalHp,
    totalDefense,
    chargeGainModifier: sumModifiers(allModifiers, 'chargeGain'),
    doubleAttackRate: sumModifiers(allModifiers, 'doubleAttackRate'),
    tripleAttackRate: sumModifiers(allModifiers, 'tripleAttackRate'),
    dropRate: capped.dropRate,
    sweepEfficiency: capped.sweepEfficiency,
    normalBoost,
    magnaBoost,
    allModifiers,
    activeBondRules,
    effectGroups: buildEffectGroups({
      activeBondRules,
      characters: input.characters,
      weapons: input.weapons,
      mainSummon,
    }),
    effectCaps: buildEffectCaps(allModifiers),
    attackBreakdown: calculateAttackBreakdown({
      baseAttack: totalAtk,
      modifiers: [...allModifiers, createElementAdvantageModifier()],
      normalBoost,
      magnaBoost,
      hpRatio: 1,
      attackKind: 'normalAttack',
    }),
  };
}
