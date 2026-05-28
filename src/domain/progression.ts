import type {
  Character,
  CharacterProgressionRule,
  Modifier,
  Passive,
  Rarity,
  StatBlock,
  Summon,
  SummonProgressionRule,
  Weapon,
  WeaponProgressionRule,
} from './types';

export interface CharacterGrowthState {
  level: number;
  exp: number;
  uncap: number;
  levelCap: number;
}

export interface WeaponGrowthState extends CharacterGrowthState {
  skillLevel: number;
}

export interface SummonGrowthState extends CharacterGrowthState {}

export interface UncapProgressVisual {
  mainStars: number;
  filledMainStars: number;
  hasTranscendenceStar: boolean;
  transcendenceFill: number;
}

const DEFAULT_CHARACTER_RULE: CharacterProgressionRule = {
  baseLevelCap: 40,
  normalUncapCount: 3,
  normalUncapStep: 20,
  normalMaxLevelCap: 100,
  transcendenceEnabled: false,
  transcendenceStepCount: 5,
  transcendenceCapStep: 10,
  finalLevelCap: 150,
  passiveUnlocks: [{ uncap: 1 }, { uncap: 3, level: 100 }],
};

const DEFAULT_WEAPON_RULE: WeaponProgressionRule = {
  baseLevelCap: 40,
  normalUncapCount: 3,
  normalUncapStep: 20,
  normalMaxLevelCap: 100,
  transcendenceEnabled: false,
  transcendenceStepCount: 5,
  transcendenceCapStep: 10,
  finalLevelCap: 150,
  baseSkillCap: 10,
  maxUncapSkillCap: 15,
};

const DEFAULT_SUMMON_RULE: SummonProgressionRule = {
  baseLevelCap: 40,
  normalUncapCount: 3,
  normalUncapStep: 20,
  normalMaxLevelCap: 100,
  transcendenceEnabled: false,
  transcendenceStepCount: 5,
  transcendenceCapStep: 10,
  finalLevelCap: 150,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mergeCharacterRule(character: Character): CharacterProgressionRule {
  return { ...DEFAULT_CHARACTER_RULE, ...character.progression };
}

function mergeWeaponRule(weapon: Weapon): WeaponProgressionRule {
  return { ...DEFAULT_WEAPON_RULE, ...weapon.progression };
}

function mergeSummonRule(summon: Summon): SummonProgressionRule {
  return { ...DEFAULT_SUMMON_RULE, ...summon.progression };
}

function buildStatGrowth(baseStats: StatBlock, levelDelta: number, divisors: { hp: number; atk: number; defense: number }) {
  const safeLevelDelta = Math.max(0, levelDelta);
  const hpPerLevel = Math.max(1, Math.round(baseStats.hp / divisors.hp));
  const atkPerLevel = Math.max(1, Math.round(baseStats.atk / divisors.atk));
  const defensePerLevel = Math.max(0, Math.round(baseStats.defense / divisors.defense));

  return {
    hp: baseStats.hp + hpPerLevel * safeLevelDelta,
    atk: baseStats.atk + atkPerLevel * safeLevelDelta,
    defense: baseStats.defense + defensePerLevel * safeLevelDelta,
  };
}

function formatPercent(value: number) {
  const scaled = Math.round(Math.abs(value) * 1000) / 10;
  return `${Number.isInteger(scaled) ? scaled.toFixed(0) : scaled.toFixed(1)}%`;
}

function relabelModifier(baseLabel: string, value: number) {
  const prefix = baseLabel.replace(/\s*[+-]\d+(\.\d+)?%.*$/, '').trim();
  const sign = value >= 0 ? '+' : '-';
  return `${prefix} ${sign}${formatPercent(value)}`;
}

function scaleWeaponModifier(modifier: Modifier, skillLevelDelta: number): Modifier {
  const nextValue = modifier.value + skillLevelDelta * 0.01;
  return {
    ...modifier,
    value: nextValue,
    label: relabelModifier(modifier.label, nextValue),
  };
}

function resolveFinalLevelCap(rule: { normalMaxLevelCap: number; transcendenceEnabled?: boolean; finalLevelCap: number }) {
  return rule.transcendenceEnabled ? rule.finalLevelCap : rule.normalMaxLevelCap;
}

export function getCharacterProgressionRule(character: Character) {
  return mergeCharacterRule(character);
}

export function getWeaponProgressionRule(weapon: Weapon) {
  return mergeWeaponRule(weapon);
}

export function getSummonProgressionRule(summon: Summon) {
  return mergeSummonRule(summon);
}

export function getInitialCharacterLevelCap(character: Pick<Character, 'maxLevel' | 'progression'>) {
  const rule = { ...DEFAULT_CHARACTER_RULE, ...character.progression };
  return Math.min(resolveFinalLevelCap(rule), rule.baseLevelCap);
}

export function getInitialWeaponLevelCap(weapon: Pick<Weapon, 'maxLevel' | 'rarity' | 'progression'>) {
  const rule = { ...DEFAULT_WEAPON_RULE, ...weapon.progression };
  return Math.min(resolveFinalLevelCap(rule), rule.baseLevelCap);
}

export function getInitialSummonLevelCap(summon: Pick<Summon, 'maxLevel' | 'rarity' | 'progression'>) {
  const rule = { ...DEFAULT_SUMMON_RULE, ...summon.progression };
  return Math.min(resolveFinalLevelCap(rule), rule.baseLevelCap);
}

export function shouldNormalizeLegacyEquipmentCap(input: {
  level: number;
  exp: number;
  uncap: number;
  levelCap: number;
  maxLevel: number;
  expectedBaseCap: number;
}) {
  return input.level === 1 && input.exp === 0 && input.uncap === 0 && input.levelCap === input.maxLevel && input.maxLevel !== input.expectedBaseCap;
}

export function getCurrentCharacterLevelCap(character: Character, state: CharacterGrowthState) {
  const rule = mergeCharacterRule(character);
  const normalCap = Math.min(rule.normalUncapCount, state.uncap) * rule.normalUncapStep + rule.baseLevelCap;
  const transcendenceSteps = Math.max(0, state.uncap - rule.normalUncapCount);
  const transcendenceCap = rule.transcendenceEnabled
    ? rule.normalMaxLevelCap + transcendenceSteps * (rule.transcendenceCapStep ?? 0)
    : rule.normalMaxLevelCap;
  const cap = state.uncap <= rule.normalUncapCount ? normalCap : transcendenceCap;
  return Math.min(resolveFinalLevelCap(rule), cap);
}

export function getCurrentWeaponLevelCap(weapon: Weapon, state: WeaponGrowthState) {
  const rule = mergeWeaponRule(weapon);
  const normalCap = Math.min(rule.normalUncapCount, state.uncap) * rule.normalUncapStep + rule.baseLevelCap;
  const transcendenceSteps = Math.max(0, state.uncap - rule.normalUncapCount);
  const transcendenceCap = rule.transcendenceEnabled
    ? rule.normalMaxLevelCap + transcendenceSteps * (rule.transcendenceCapStep ?? 0)
    : rule.normalMaxLevelCap;
  const cap = state.uncap <= rule.normalUncapCount ? normalCap : transcendenceCap;
  return Math.min(resolveFinalLevelCap(rule), cap);
}

export function getCurrentSummonLevelCap(summon: Summon, state: SummonGrowthState) {
  const rule = mergeSummonRule(summon);
  const normalCap = Math.min(rule.normalUncapCount, state.uncap) * rule.normalUncapStep + rule.baseLevelCap;
  const transcendenceSteps = Math.max(0, state.uncap - rule.normalUncapCount);
  const transcendenceCap = rule.transcendenceEnabled
    ? rule.normalMaxLevelCap + transcendenceSteps * (rule.transcendenceCapStep ?? 0)
    : rule.normalMaxLevelCap;
  const cap = state.uncap <= rule.normalUncapCount ? normalCap : transcendenceCap;
  return Math.min(resolveFinalLevelCap(rule), cap);
}

export function getWeaponSkillCap(weapon: Weapon, state: WeaponGrowthState) {
  const rule = mergeWeaponRule(weapon);
  return state.uncap >= rule.normalUncapCount ? rule.maxUncapSkillCap : rule.baseSkillCap;
}

export function getUnlockedCharacterPassives(character: Character, state: CharacterGrowthState | undefined): Passive[] {
  if (!state) return [];
  const rule = mergeCharacterRule(character);
  return character.passives.filter((passive, index) => {
    const unlock = rule.passiveUnlocks[index];
    if (!unlock) return false;
    if (state.uncap < unlock.uncap) return false;
    if (unlock.level && state.level < unlock.level) return false;
    return true;
  });
}

export function getUncapProgressVisual(input: {
  uncap: number;
  rule: { normalUncapCount: number; transcendenceEnabled?: boolean; transcendenceStepCount?: number };
}): UncapProgressVisual {
  const filledMainStars = Math.min(input.rule.normalUncapCount, input.uncap);
  const transcendenceSteps = Math.max(0, input.uncap - input.rule.normalUncapCount);
  const maxTranscendenceSteps = input.rule.transcendenceEnabled ? input.rule.transcendenceStepCount ?? 0 : 0;

  return {
    mainStars: input.rule.normalUncapCount,
    filledMainStars,
    hasTranscendenceStar: maxTranscendenceSteps > 0,
    transcendenceFill: maxTranscendenceSteps > 0 ? clamp(transcendenceSteps / maxTranscendenceSteps, 0, 1) : 0,
  };
}

export function applyCharacterProgression(character: Character, state: CharacterGrowthState | undefined): Character {
  const mergedState = {
    level: state?.level ?? character.level,
    exp: state?.exp ?? 0,
    uncap: state?.uncap ?? 0,
    levelCap: state?.levelCap ?? getInitialCharacterLevelCap(character),
  };
  const currentLevelCap = getCurrentCharacterLevelCap(character, mergedState);
  const currentLevel = clamp(mergedState.level, 1, currentLevelCap);

  return {
    ...character,
    level: currentLevel,
    maxLevel: currentLevelCap,
    passives: character.passives,
    stats: buildStatGrowth(character.stats, currentLevel - character.level, { hp: 65, atk: 65, defense: 200 }),
  };
}

export function applyWeaponProgression(weapon: Weapon, state: WeaponGrowthState | undefined): Weapon {
  const mergedState = {
    level: state?.level ?? weapon.level,
    exp: state?.exp ?? 0,
    uncap: state?.uncap ?? 0,
    levelCap: state?.levelCap ?? getInitialWeaponLevelCap(weapon),
    skillLevel: state?.skillLevel ?? weapon.skills[0]?.level ?? 1,
  };
  const currentLevelCap = getCurrentWeaponLevelCap(weapon, mergedState);
  const currentLevel = clamp(mergedState.level, 1, currentLevelCap);
  const skillLevel = clamp(mergedState.skillLevel, 1, getWeaponSkillCap(weapon, mergedState));

  return {
    ...weapon,
    level: currentLevel,
    maxLevel: currentLevelCap,
    stats: buildStatGrowth(weapon.stats, currentLevel - weapon.level, { hp: 50, atk: 50, defense: 9999 }),
    skills: weapon.skills.map((skill) => ({
      ...skill,
      level: skillLevel,
      modifiers: skill.modifiers.map((modifier) => scaleWeaponModifier(modifier, skillLevel - skill.level)),
    })),
  };
}

export function applySummonProgression(summon: Summon, state: SummonGrowthState | undefined): Summon {
  const mergedState = {
    level: state?.level ?? summon.level,
    exp: state?.exp ?? 0,
    uncap: state?.uncap ?? 0,
    levelCap: state?.levelCap ?? getInitialSummonLevelCap(summon),
  };
  const currentLevelCap = getCurrentSummonLevelCap(summon, mergedState);
  const currentLevel = clamp(mergedState.level, 1, currentLevelCap);

  return {
    ...summon,
    level: currentLevel,
    maxLevel: currentLevelCap,
    stats: buildStatGrowth(summon.stats, currentLevel - summon.level, { hp: 45, atk: 45, defense: 9999 }),
  };
}
