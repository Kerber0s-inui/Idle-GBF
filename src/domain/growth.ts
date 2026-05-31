import { initialCharacters, initialSummons, initialWeapons } from './content';
import {
  applyCharacterProgression,
  applySummonProgression,
  applyWeaponProgression,
  getCurrentCharacterLevelCap,
  getCurrentSummonLevelCap,
  getCurrentWeaponLevelCap,
  getInitialCharacterLevelCap,
  getInitialSummonLevelCap,
  getInitialWeaponLevelCap,
  getWeaponSkillCap,
  getCharacterProgressionRule,
  getSummonProgressionRule,
  getWeaponProgressionRule,
  type CharacterGrowthState,
  type SummonGrowthState,
  type WeaponGrowthState,
} from './progression';
import type { Character, Summon, Weapon } from './types';
import type { SaveFile } from './save';

const CHARACTER_EXP_MATERIAL = 'fire-character-exp';
const CHARACTER_UNCAP_MATERIAL = 'fire-character-uncap';
const WEAPON_EXP_MATERIAL = 'fire-weapon-exp';
const WEAPON_SKILL_MATERIAL = 'fire-weapon-skill';
const WEAPON_UNCAP_MATERIAL = 'fire-weapon-uncap';
const SUMMON_EXP_MATERIAL = 'fire-summon-exp';
const SUMMON_UNCAP_MATERIAL = 'fire-summon-uncap';
const DISMANTLE_RETURN_RATIO = 0.8;

const CHARACTER_LEVEL_COSTS = [
  { until: 40, cost: 1 },
  { until: 60, cost: 2 },
  { until: 80, cost: 3 },
  { until: 100, cost: 4 },
  { until: 120, cost: 5 },
  { until: 150, cost: 6 },
];

const WEAPON_LEVEL_COSTS = [
  { until: 20, cost: 1 },
  { until: 40, cost: 2 },
  { until: 60, cost: 3 },
  { until: 80, cost: 4 },
  { until: 100, cost: 5 },
  { until: 120, cost: 6 },
  { until: 150, cost: 7 },
];

const SUMMON_LEVEL_COSTS = [
  { until: 20, cost: 1 },
  { until: 40, cost: 2 },
  { until: 60, cost: 3 },
  { until: 80, cost: 4 },
  { until: 100, cost: 5 },
  { until: 120, cost: 6 },
  { until: 150, cost: 7 },
];

const WEAPON_SKILL_COSTS = [
  { until: 5, cost: 1 },
  { until: 10, cost: 2 },
  { until: 12, cost: 3 },
  { until: 15, cost: 4 },
];

const CHARACTER_UNCAP_COSTS = [1, 2, 3, 4, 5, 6, 7, 8];
const WEAPON_UNCAP_COSTS = [1, 2, 3, 4, 5, 6, 7, 8];
const SUMMON_UNCAP_COSTS = [1, 2, 3, 4, 5, 6, 7, 8];

export type GrowthActionKind =
  | 'characterUpgrade'
  | 'characterUncap'
  | 'weaponUpgrade'
  | 'weaponSkillUpgrade'
  | 'weaponUncap'
  | 'weaponDismantle'
  | 'summonUpgrade'
  | 'summonUncap'
  | 'summonDismantle';

export type GrowthModalMode = 'level' | 'skill' | 'uncap' | 'dismantle';

export interface GrowthOption {
  value: number;
  label: string;
}

export interface GrowthCostLine {
  materialId: string;
  label: string;
  quantity: number;
}

export interface GrowthPreviewSnapshot {
  level?: number;
  levelCap?: number;
  skillLevel?: number;
  uncap?: number;
  atk?: number;
  hp?: number;
  defense?: number;
  skillLines?: string[];
}

export interface GrowthPreviewResult {
  save: SaveFile;
  action: GrowthActionKind;
  itemId: string;
  itemName: string;
  targetValue: number;
  targetLabel: string;
  costs: GrowthCostLine[];
  current: GrowthPreviewSnapshot;
  next: GrowthPreviewSnapshot;
  spent: number;
  requested: number;
  maxAllowed: number;
}

export interface GrowthSelectionDefinition {
  action: GrowthActionKind;
  mode: GrowthModalMode;
  itemId: string;
  itemName: string;
  title: string;
  targetLabel: string;
  options: GrowthOption[];
  currentValue: number;
}

export interface DismantleRewardLine {
  materialId: string;
  label: string;
  quantity: number;
}

export interface DismantlePreviewResult {
  save: SaveFile;
  action: 'weaponDismantle' | 'summonDismantle';
  itemId: string;
  itemName: string;
  rewards: DismantleRewardLine[];
}

type CharacterState = SaveFile['characterStates'][string];
type WeaponState = SaveFile['weaponStates'][string];
type SummonState = SaveFile['summonStates'][string];

function cloneSave(save: SaveFile): SaveFile {
  return {
    ...save,
    progress: {
      ...save.progress,
      clearedQuestIds: [...save.progress.clearedQuestIds],
      unlockedCharacterIds: [...save.progress.unlockedCharacterIds],
    },
    inventory: {
      ...save.inventory,
      characterIds: [...save.inventory.characterIds],
      weaponIds: [...save.inventory.weaponIds],
      summonIds: [...save.inventory.summonIds],
      materials: { ...save.inventory.materials },
      currencies: { ...save.inventory.currencies },
    },
    formation: {
      activeElement: save.formation.activeElement,
      characterIds: [...save.formation.characterIds],
      weaponIds: [...save.formation.weaponIds],
      summonIds: [...save.formation.summonIds],
      teams: {
        fire: {
          characterIds: [...save.formation.teams.fire.characterIds],
          weaponIds: [...save.formation.teams.fire.weaponIds],
          summonIds: [...save.formation.teams.fire.summonIds],
        },
        water: {
          characterIds: [...save.formation.teams.water.characterIds],
          weaponIds: [...save.formation.teams.water.weaponIds],
          summonIds: [...save.formation.teams.water.summonIds],
        },
        earth: {
          characterIds: [...save.formation.teams.earth.characterIds],
          weaponIds: [...save.formation.teams.earth.weaponIds],
          summonIds: [...save.formation.teams.earth.summonIds],
        },
        wind: {
          characterIds: [...save.formation.teams.wind.characterIds],
          weaponIds: [...save.formation.teams.wind.weaponIds],
          summonIds: [...save.formation.teams.wind.summonIds],
        },
        light: {
          characterIds: [...save.formation.teams.light.characterIds],
          weaponIds: [...save.formation.teams.light.weaponIds],
          summonIds: [...save.formation.teams.light.summonIds],
        },
        dark: {
          characterIds: [...save.formation.teams.dark.characterIds],
          weaponIds: [...save.formation.teams.dark.weaponIds],
          summonIds: [...save.formation.teams.dark.summonIds],
        },
      },
    },
    characterStates: Object.fromEntries(Object.entries(save.characterStates).map(([id, state]) => [id, { ...state }])),
    weaponStates: Object.fromEntries(Object.entries(save.weaponStates).map(([id, state]) => [id, { ...state }])),
    summonStates: Object.fromEntries(Object.entries(save.summonStates).map(([id, state]) => [id, { ...state }])),
    activeRun: save.activeRun ? { ...save.activeRun } : null,
  };
}

function levelFromExp(exp: number, levelCap: number) {
  const safeExp = Math.max(0, Number.isFinite(exp) ? exp : 0);
  return Math.min(levelCap, 1 + Math.floor(safeExp / 1000));
}

function materialCount(save: SaveFile, materialId: string) {
  return save.inventory.materials[materialId] ?? 0;
}

function buildCharacterSnapshot(character: Character, state: CharacterGrowthState): GrowthPreviewSnapshot {
  const progressed = applyCharacterProgression(character, state);
  return {
    level: state.level,
    levelCap: state.levelCap,
    uncap: state.uncap,
    atk: progressed.stats.atk,
    hp: progressed.stats.hp,
    defense: progressed.stats.defense,
  };
}

function buildWeaponSnapshot(weapon: Weapon, state: WeaponGrowthState): GrowthPreviewSnapshot {
  const progressed = applyWeaponProgression(weapon, state);
  return {
    level: state.level,
    levelCap: state.levelCap,
    skillLevel: state.skillLevel,
    uncap: state.uncap,
    atk: progressed.stats.atk,
    hp: progressed.stats.hp,
    defense: progressed.stats.defense,
    skillLines: progressed.skills.slice(0, 2).map((skill) => skill.modifiers.map((modifier) => modifier.label).join(' / ')),
  };
}

function buildSummonSnapshot(summon: Summon, state: SummonGrowthState): GrowthPreviewSnapshot {
  const progressed = applySummonProgression(summon, state);
  return {
    level: state.level,
    levelCap: state.levelCap,
    uncap: state.uncap,
    atk: progressed.stats.atk,
    hp: progressed.stats.hp,
    defense: progressed.stats.defense,
  };
}

function materialLabel(materialId: string) {
  switch (materialId) {
    case CHARACTER_EXP_MATERIAL:
      return '角色经验素材';
    case CHARACTER_UNCAP_MATERIAL:
      return '角色突破素材';
    case WEAPON_EXP_MATERIAL:
      return '武器经验合金';
    case WEAPON_SKILL_MATERIAL:
      return '词条回路片';
    case WEAPON_UNCAP_MATERIAL:
      return '武器突破块';
    case SUMMON_EXP_MATERIAL:
      return '召唤经验晶';
    case SUMMON_UNCAP_MATERIAL:
      return '召唤突破核';
    default:
      return materialId;
  }
}

function clampTarget(options: GrowthOption[], target: number) {
  if (options.length === 0) throw new Error('当前没有可执行的目标');
  if (options.some((option) => option.value === target)) return target;
  return options[options.length - 1]?.value ?? target;
}

function sumCostToLevel(targetLevel: number, currentLevel: number, table: Array<{ until: number; cost: number }>) {
  let total = 0;
  for (let level = currentLevel + 1; level <= targetLevel; level += 1) {
    total += table.find((row) => level <= row.until)?.cost ?? table[table.length - 1]?.cost ?? 0;
  }
  return total;
}

function sumCostToUncap(targetUncap: number, currentUncap: number, table: number[]) {
  let total = 0;
  for (let stage = currentUncap + 1; stage <= targetUncap; stage += 1) {
    total += table[stage - 1] ?? table[table.length - 1] ?? 0;
  }
  return total;
}

function sumCostToSkill(targetSkillLevel: number, currentSkillLevel: number) {
  let total = 0;
  for (let level = currentSkillLevel + 1; level <= targetSkillLevel; level += 1) {
    total += WEAPON_SKILL_COSTS.find((row) => level <= row.until)?.cost ?? WEAPON_SKILL_COSTS[WEAPON_SKILL_COSTS.length - 1]?.cost ?? 0;
  }
  return total;
}

function spendMaterial(save: SaveFile, materialId: string, quantity: number) {
  if (quantity <= 0) return;
  const current = materialCount(save, materialId);
  if (current < quantity) throw new Error(`${materialLabel(materialId)}不足`);
  save.inventory.materials[materialId] = current - quantity;
}

function grantMaterial(save: SaveFile, materialId: string, quantity: number) {
  if (quantity <= 0) return;
  save.inventory.materials[materialId] = materialCount(save, materialId) + quantity;
}

function assertOwned(save: SaveFile, kind: 'character' | 'weapon' | 'summon', itemId: string) {
  const source =
    kind === 'character'
      ? save.inventory.characterIds
      : kind === 'weapon'
        ? save.inventory.weaponIds
        : save.inventory.summonIds;
  if (!source.includes(itemId)) {
    throw new Error(kind === 'character' ? '角色未持有' : kind === 'weapon' ? '武器未持有' : '召唤未持有');
  }
}

function findCharacter(characterId: string) {
  const character = initialCharacters.find((candidate) => candidate.id === characterId);
  if (!character) throw new Error('角色不存在');
  return character;
}

function findWeapon(weaponId: string) {
  const weapon = initialWeapons.find((candidate) => candidate.id === weaponId);
  if (!weapon) throw new Error('武器不存在');
  return weapon;
}

function findSummon(summonId: string) {
  const summon = initialSummons.find((candidate) => candidate.id === summonId);
  if (!summon) throw new Error('召唤不存在');
  return summon;
}

function normalizeCharacterState(save: SaveFile, characterId: string): CharacterState {
  const character = findCharacter(characterId);
  return (
    save.characterStates[characterId] ?? {
      level: character.level,
      exp: 0,
      uncap: 0,
      levelCap: getInitialCharacterLevelCap(character),
    }
  );
}

function normalizeWeaponState(save: SaveFile, weaponId: string): WeaponState {
  const weapon = findWeapon(weaponId);
  return (
    save.weaponStates[weaponId] ?? {
      level: weapon.level,
      exp: 0,
      uncap: 0,
      levelCap: getInitialWeaponLevelCap(weapon),
      skillLevel: weapon.skills[0]?.level ?? 1,
    }
  );
}

function normalizeSummonState(save: SaveFile, summonId: string): SummonState {
  const summon = findSummon(summonId);
  return (
    save.summonStates[summonId] ?? {
      level: summon.level,
      exp: 0,
      uncap: 0,
      levelCap: getInitialSummonLevelCap(summon),
    }
  );
}

function setCharacterLevel(state: CharacterGrowthState, level: number) {
  state.level = level;
  state.exp = (level - 1) * 1000;
}

function setWeaponLevel(state: WeaponGrowthState, level: number) {
  state.level = level;
  state.exp = (level - 1) * 1000;
}

function setSummonLevel(state: SummonGrowthState, level: number) {
  state.level = level;
  state.exp = (level - 1) * 1000;
}

function isWeaponEquipped(save: SaveFile, weaponId: string) {
  return Object.values(save.formation.teams).some((team) => team.weaponIds.includes(weaponId));
}

function isSummonEquipped(save: SaveFile, summonId: string) {
  return Object.values(save.formation.teams).some((team) => team.summonIds.includes(summonId));
}

function buildSelectionDefinition(input: {
  action: GrowthActionKind;
  mode: GrowthModalMode;
  itemId: string;
  itemName: string;
  title: string;
  targetLabel: string;
  options: GrowthOption[];
  currentValue: number;
}): GrowthSelectionDefinition {
  if (input.options.length === 0) throw new Error('当前无法执行该操作');
  return input;
}

function previewCharacterUpgradeInternal(save: SaveFile, characterId: string, targetLevel: number): GrowthPreviewResult {
  assertOwned(save, 'character', characterId);
  const character = findCharacter(characterId);
  const currentState = normalizeCharacterState(save, characterId);
  const maxLevel = getCurrentCharacterLevelCap(character, currentState);
  if (currentState.level >= maxLevel) throw new Error('已达到当前等级上限');

  const options = getCharacterUpgradeOptions(save, characterId).options;
  const resolvedTarget = clampTarget(options, targetLevel);
  const cost = sumCostToLevel(resolvedTarget, currentState.level, CHARACTER_LEVEL_COSTS);
  const next = cloneSave(save);
  spendMaterial(next, CHARACTER_EXP_MATERIAL, cost);
  const nextState = { ...currentState };
  setCharacterLevel(nextState, resolvedTarget);
  next.characterStates[characterId] = nextState;

  return {
    save: next,
    action: 'characterUpgrade',
    itemId: characterId,
    itemName: character.name,
    targetValue: resolvedTarget,
    targetLabel: `Lv.${resolvedTarget}`,
    costs: [{ materialId: CHARACTER_EXP_MATERIAL, label: materialLabel(CHARACTER_EXP_MATERIAL), quantity: cost }],
    current: buildCharacterSnapshot(character, currentState),
    next: buildCharacterSnapshot(character, nextState),
    spent: cost,
    requested: resolvedTarget,
    maxAllowed: options[options.length - 1]?.value ?? resolvedTarget,
  };
}

function previewCharacterUncapInternal(save: SaveFile, characterId: string, targetUncap: number): GrowthPreviewResult {
  assertOwned(save, 'character', characterId);
  const character = findCharacter(characterId);
  const currentState = normalizeCharacterState(save, characterId);
  const options = getCharacterUncapOptions(save, characterId).options;
  const resolvedTarget = clampTarget(options, targetUncap);
  const cost = sumCostToUncap(resolvedTarget, currentState.uncap, CHARACTER_UNCAP_COSTS);
  const next = cloneSave(save);
  spendMaterial(next, CHARACTER_UNCAP_MATERIAL, cost);
  const nextState = { ...currentState, uncap: resolvedTarget };
  nextState.levelCap = getCurrentCharacterLevelCap(character, nextState);
  nextState.level = Math.min(nextState.level, nextState.levelCap);
  nextState.exp = Math.min(nextState.exp, (nextState.levelCap - 1) * 1000);
  next.characterStates[characterId] = nextState;

  return {
    save: next,
    action: 'characterUncap',
    itemId: characterId,
    itemName: character.name,
    targetValue: resolvedTarget,
    targetLabel: `阶段${resolvedTarget}`,
    costs: [{ materialId: CHARACTER_UNCAP_MATERIAL, label: materialLabel(CHARACTER_UNCAP_MATERIAL), quantity: cost }],
    current: buildCharacterSnapshot(character, currentState),
    next: buildCharacterSnapshot(character, nextState),
    spent: cost,
    requested: resolvedTarget,
    maxAllowed: options[options.length - 1]?.value ?? resolvedTarget,
  };
}

function previewWeaponUpgradeInternal(save: SaveFile, weaponId: string, targetLevel: number): GrowthPreviewResult {
  assertOwned(save, 'weapon', weaponId);
  const weapon = findWeapon(weaponId);
  const currentState = normalizeWeaponState(save, weaponId);
  const options = getWeaponUpgradeOptions(save, weaponId).options;
  const resolvedTarget = clampTarget(options, targetLevel);
  const cost = sumCostToLevel(resolvedTarget, currentState.level, WEAPON_LEVEL_COSTS);
  const next = cloneSave(save);
  spendMaterial(next, WEAPON_EXP_MATERIAL, cost);
  const nextState = { ...currentState };
  setWeaponLevel(nextState, resolvedTarget);
  next.weaponStates[weaponId] = nextState;

  return {
    save: next,
    action: 'weaponUpgrade',
    itemId: weaponId,
    itemName: weapon.name,
    targetValue: resolvedTarget,
    targetLabel: `Lv.${resolvedTarget}`,
    costs: [{ materialId: WEAPON_EXP_MATERIAL, label: materialLabel(WEAPON_EXP_MATERIAL), quantity: cost }],
    current: buildWeaponSnapshot(weapon, currentState),
    next: buildWeaponSnapshot(weapon, nextState),
    spent: cost,
    requested: resolvedTarget,
    maxAllowed: options[options.length - 1]?.value ?? resolvedTarget,
  };
}

function previewWeaponSkillUpgradeInternal(save: SaveFile, weaponId: string, targetSkillLevel: number): GrowthPreviewResult {
  assertOwned(save, 'weapon', weaponId);
  const weapon = findWeapon(weaponId);
  const currentState = normalizeWeaponState(save, weaponId);
  const options = getWeaponSkillUpgradeOptions(save, weaponId).options;
  const resolvedTarget = clampTarget(options, targetSkillLevel);
  const cost = sumCostToSkill(resolvedTarget, currentState.skillLevel);
  const next = cloneSave(save);
  spendMaterial(next, WEAPON_SKILL_MATERIAL, cost);
  const nextState = { ...currentState, skillLevel: resolvedTarget };
  next.weaponStates[weaponId] = nextState;

  return {
    save: next,
    action: 'weaponSkillUpgrade',
    itemId: weaponId,
    itemName: weapon.name,
    targetValue: resolvedTarget,
    targetLabel: `SLv.${resolvedTarget}`,
    costs: [{ materialId: WEAPON_SKILL_MATERIAL, label: materialLabel(WEAPON_SKILL_MATERIAL), quantity: cost }],
    current: buildWeaponSnapshot(weapon, currentState),
    next: buildWeaponSnapshot(weapon, nextState),
    spent: cost,
    requested: resolvedTarget,
    maxAllowed: options[options.length - 1]?.value ?? resolvedTarget,
  };
}

function previewWeaponUncapInternal(save: SaveFile, weaponId: string, targetUncap: number): GrowthPreviewResult {
  assertOwned(save, 'weapon', weaponId);
  const weapon = findWeapon(weaponId);
  const currentState = normalizeWeaponState(save, weaponId);
  const options = getWeaponUncapOptions(save, weaponId).options;
  const resolvedTarget = clampTarget(options, targetUncap);
  const cost = sumCostToUncap(resolvedTarget, currentState.uncap, WEAPON_UNCAP_COSTS);
  const next = cloneSave(save);
  spendMaterial(next, WEAPON_UNCAP_MATERIAL, cost);
  const nextState = { ...currentState, uncap: resolvedTarget };
  nextState.levelCap = getCurrentWeaponLevelCap(weapon, nextState);
  nextState.level = Math.min(nextState.level, nextState.levelCap);
  nextState.exp = Math.min(nextState.exp, (nextState.levelCap - 1) * 1000);
  nextState.skillLevel = Math.min(nextState.skillLevel, getWeaponSkillCap(weapon, nextState));
  next.weaponStates[weaponId] = nextState;

  return {
    save: next,
    action: 'weaponUncap',
    itemId: weaponId,
    itemName: weapon.name,
    targetValue: resolvedTarget,
    targetLabel: `阶段${resolvedTarget}`,
    costs: [{ materialId: WEAPON_UNCAP_MATERIAL, label: materialLabel(WEAPON_UNCAP_MATERIAL), quantity: cost }],
    current: buildWeaponSnapshot(weapon, currentState),
    next: buildWeaponSnapshot(weapon, nextState),
    spent: cost,
    requested: resolvedTarget,
    maxAllowed: options[options.length - 1]?.value ?? resolvedTarget,
  };
}

function previewSummonUpgradeInternal(save: SaveFile, summonId: string, targetLevel: number): GrowthPreviewResult {
  assertOwned(save, 'summon', summonId);
  const summon = findSummon(summonId);
  const currentState = normalizeSummonState(save, summonId);
  const options = getSummonUpgradeOptions(save, summonId).options;
  const resolvedTarget = clampTarget(options, targetLevel);
  const cost = sumCostToLevel(resolvedTarget, currentState.level, SUMMON_LEVEL_COSTS);
  const next = cloneSave(save);
  spendMaterial(next, SUMMON_EXP_MATERIAL, cost);
  const nextState = { ...currentState };
  setSummonLevel(nextState, resolvedTarget);
  next.summonStates[summonId] = nextState;

  return {
    save: next,
    action: 'summonUpgrade',
    itemId: summonId,
    itemName: summon.name,
    targetValue: resolvedTarget,
    targetLabel: `Lv.${resolvedTarget}`,
    costs: [{ materialId: SUMMON_EXP_MATERIAL, label: materialLabel(SUMMON_EXP_MATERIAL), quantity: cost }],
    current: buildSummonSnapshot(summon, currentState),
    next: buildSummonSnapshot(summon, nextState),
    spent: cost,
    requested: resolvedTarget,
    maxAllowed: options[options.length - 1]?.value ?? resolvedTarget,
  };
}

function previewSummonUncapInternal(save: SaveFile, summonId: string, targetUncap: number): GrowthPreviewResult {
  assertOwned(save, 'summon', summonId);
  const summon = findSummon(summonId);
  const currentState = normalizeSummonState(save, summonId);
  const options = getSummonUncapOptions(save, summonId).options;
  const resolvedTarget = clampTarget(options, targetUncap);
  const cost = sumCostToUncap(resolvedTarget, currentState.uncap, SUMMON_UNCAP_COSTS);
  const next = cloneSave(save);
  spendMaterial(next, SUMMON_UNCAP_MATERIAL, cost);
  const nextState = { ...currentState, uncap: resolvedTarget };
  nextState.levelCap = getCurrentSummonLevelCap(summon, nextState);
  nextState.level = Math.min(nextState.level, nextState.levelCap);
  nextState.exp = Math.min(nextState.exp, (nextState.levelCap - 1) * 1000);
  next.summonStates[summonId] = nextState;

  return {
    save: next,
    action: 'summonUncap',
    itemId: summonId,
    itemName: summon.name,
    targetValue: resolvedTarget,
    targetLabel: `阶段${resolvedTarget}`,
    costs: [{ materialId: SUMMON_UNCAP_MATERIAL, label: materialLabel(SUMMON_UNCAP_MATERIAL), quantity: cost }],
    current: buildSummonSnapshot(summon, currentState),
    next: buildSummonSnapshot(summon, nextState),
    spent: cost,
    requested: resolvedTarget,
    maxAllowed: options[options.length - 1]?.value ?? resolvedTarget,
  };
}

function createDismantleRewards(input: {
  expMaterialId: string;
  expCost: number;
  skillMaterialId?: string;
  skillCost?: number;
  uncapMaterialId: string;
  uncapCost: number;
}) {
  const rewards: DismantleRewardLine[] = [
    {
      materialId: input.expMaterialId,
      label: materialLabel(input.expMaterialId),
      quantity: Math.ceil(input.expCost * DISMANTLE_RETURN_RATIO),
    },
    {
      materialId: input.uncapMaterialId,
      label: materialLabel(input.uncapMaterialId),
      quantity: Math.ceil(input.uncapCost * DISMANTLE_RETURN_RATIO),
    },
  ];

  if (input.skillMaterialId) {
    rewards.splice(1, 0, {
      materialId: input.skillMaterialId,
      label: materialLabel(input.skillMaterialId),
      quantity: Math.ceil((input.skillCost ?? 0) * DISMANTLE_RETURN_RATIO),
    });
  }

  return rewards.filter((reward) => reward.quantity > 0);
}

export function getCharacterUpgradeOptions(save: SaveFile, characterId: string): GrowthSelectionDefinition {
  assertOwned(save, 'character', characterId);
  const character = findCharacter(characterId);
  const state = normalizeCharacterState(save, characterId);
  const cap = getCurrentCharacterLevelCap(character, state);
  const materialBudget = materialCount(save, CHARACTER_EXP_MATERIAL);
  const options: GrowthOption[] = [];
  let spent = 0;

  for (let level = state.level + 1; level <= cap; level += 1) {
    const stepCost = sumCostToLevel(level, level - 1, CHARACTER_LEVEL_COSTS);
    if (spent + stepCost > materialBudget) break;
    spent += stepCost;
    options.push({ value: level, label: `Lv.${level}` });
  }

  return buildSelectionDefinition({
    action: 'characterUpgrade',
    mode: 'level',
    itemId: characterId,
    itemName: character.name,
    title: '强化角色',
    targetLabel: '目标等级',
    options,
    currentValue: state.level,
  });
}

export function getCharacterUncapOptions(save: SaveFile, characterId: string): GrowthSelectionDefinition {
  assertOwned(save, 'character', characterId);
  const character = findCharacter(characterId);
  const state = normalizeCharacterState(save, characterId);
  const rule = getCharacterProgressionRule(character);
  const maxUncap = rule.normalUncapCount + (rule.transcendenceEnabled ? rule.transcendenceStepCount ?? 0 : 0);
  const materialBudget = materialCount(save, CHARACTER_UNCAP_MATERIAL);
  const options: GrowthOption[] = [];
  let spent = 0;

  for (let stage = state.uncap + 1; stage <= maxUncap; stage += 1) {
    const stepCost = CHARACTER_UNCAP_COSTS[stage - 1] ?? CHARACTER_UNCAP_COSTS[CHARACTER_UNCAP_COSTS.length - 1] ?? 0;
    if (spent + stepCost > materialBudget) break;
    spent += stepCost;
    options.push({ value: stage, label: `阶段${stage}` });
  }

  return buildSelectionDefinition({
    action: 'characterUncap',
    mode: 'uncap',
    itemId: characterId,
    itemName: character.name,
    title: '突破角色',
    targetLabel: '目标阶段',
    options,
    currentValue: state.uncap,
  });
}

export function getWeaponUpgradeOptions(save: SaveFile, weaponId: string): GrowthSelectionDefinition {
  assertOwned(save, 'weapon', weaponId);
  const weapon = findWeapon(weaponId);
  const state = normalizeWeaponState(save, weaponId);
  const cap = getCurrentWeaponLevelCap(weapon, state);
  const materialBudget = materialCount(save, WEAPON_EXP_MATERIAL);
  const options: GrowthOption[] = [];
  let spent = 0;

  for (let level = state.level + 1; level <= cap; level += 1) {
    const stepCost = sumCostToLevel(level, level - 1, WEAPON_LEVEL_COSTS);
    if (spent + stepCost > materialBudget) break;
    spent += stepCost;
    options.push({ value: level, label: `Lv.${level}` });
  }

  return buildSelectionDefinition({
    action: 'weaponUpgrade',
    mode: 'level',
    itemId: weaponId,
    itemName: weapon.name,
    title: '强化武器',
    targetLabel: '目标等级',
    options,
    currentValue: state.level,
  });
}

export function getWeaponSkillUpgradeOptions(save: SaveFile, weaponId: string): GrowthSelectionDefinition {
  assertOwned(save, 'weapon', weaponId);
  const weapon = findWeapon(weaponId);
  const state = normalizeWeaponState(save, weaponId);
  const cap = getWeaponSkillCap(weapon, state);
  const materialBudget = materialCount(save, WEAPON_SKILL_MATERIAL);
  const options: GrowthOption[] = [];
  let spent = 0;

  for (let skillLevel = state.skillLevel + 1; skillLevel <= cap; skillLevel += 1) {
    const stepCost = sumCostToSkill(skillLevel, skillLevel - 1);
    if (spent + stepCost > materialBudget) break;
    spent += stepCost;
    options.push({ value: skillLevel, label: `SLv.${skillLevel}` });
  }

  return buildSelectionDefinition({
    action: 'weaponSkillUpgrade',
    mode: 'skill',
    itemId: weaponId,
    itemName: weapon.name,
    title: '强化词条',
    targetLabel: '目标技能等级',
    options,
    currentValue: state.skillLevel,
  });
}

export function getWeaponUncapOptions(save: SaveFile, weaponId: string): GrowthSelectionDefinition {
  assertOwned(save, 'weapon', weaponId);
  const weapon = findWeapon(weaponId);
  const state = normalizeWeaponState(save, weaponId);
  const rule = getWeaponProgressionRule(weapon);
  const maxUncap = rule.normalUncapCount + (rule.transcendenceEnabled ? rule.transcendenceStepCount ?? 0 : 0);
  const materialBudget = materialCount(save, WEAPON_UNCAP_MATERIAL);
  const options: GrowthOption[] = [];
  let spent = 0;

  for (let stage = state.uncap + 1; stage <= maxUncap; stage += 1) {
    const stepCost = WEAPON_UNCAP_COSTS[stage - 1] ?? WEAPON_UNCAP_COSTS[WEAPON_UNCAP_COSTS.length - 1] ?? 0;
    if (spent + stepCost > materialBudget) break;
    spent += stepCost;
    options.push({ value: stage, label: `阶段${stage}` });
  }

  return buildSelectionDefinition({
    action: 'weaponUncap',
    mode: 'uncap',
    itemId: weaponId,
    itemName: weapon.name,
    title: '突破武器',
    targetLabel: '目标阶段',
    options,
    currentValue: state.uncap,
  });
}

export function getSummonUpgradeOptions(save: SaveFile, summonId: string): GrowthSelectionDefinition {
  assertOwned(save, 'summon', summonId);
  const summon = findSummon(summonId);
  const state = normalizeSummonState(save, summonId);
  const cap = getCurrentSummonLevelCap(summon, state);
  const materialBudget = materialCount(save, SUMMON_EXP_MATERIAL);
  const options: GrowthOption[] = [];
  let spent = 0;

  for (let level = state.level + 1; level <= cap; level += 1) {
    const stepCost = sumCostToLevel(level, level - 1, SUMMON_LEVEL_COSTS);
    if (spent + stepCost > materialBudget) break;
    spent += stepCost;
    options.push({ value: level, label: `Lv.${level}` });
  }

  return buildSelectionDefinition({
    action: 'summonUpgrade',
    mode: 'level',
    itemId: summonId,
    itemName: summon.name,
    title: '强化召唤石',
    targetLabel: '目标等级',
    options,
    currentValue: state.level,
  });
}

export function getSummonUncapOptions(save: SaveFile, summonId: string): GrowthSelectionDefinition {
  assertOwned(save, 'summon', summonId);
  const summon = findSummon(summonId);
  const state = normalizeSummonState(save, summonId);
  const rule = getSummonProgressionRule(summon);
  const maxUncap = rule.normalUncapCount + (rule.transcendenceEnabled ? rule.transcendenceStepCount ?? 0 : 0);
  const materialBudget = materialCount(save, SUMMON_UNCAP_MATERIAL);
  const options: GrowthOption[] = [];
  let spent = 0;

  for (let stage = state.uncap + 1; stage <= maxUncap; stage += 1) {
    const stepCost = SUMMON_UNCAP_COSTS[stage - 1] ?? SUMMON_UNCAP_COSTS[SUMMON_UNCAP_COSTS.length - 1] ?? 0;
    if (spent + stepCost > materialBudget) break;
    spent += stepCost;
    options.push({ value: stage, label: `阶段${stage}` });
  }

  return buildSelectionDefinition({
    action: 'summonUncap',
    mode: 'uncap',
    itemId: summonId,
    itemName: summon.name,
    title: '突破召唤石',
    targetLabel: '目标阶段',
    options,
    currentValue: state.uncap,
  });
}

export function previewCharacterUpgrade(save: SaveFile, characterId: string, targetLevel: number) {
  return previewCharacterUpgradeInternal(save, characterId, targetLevel);
}

export function previewCharacterUncap(save: SaveFile, characterId: string, targetUncap: number) {
  return previewCharacterUncapInternal(save, characterId, targetUncap);
}

export function previewWeaponUpgrade(save: SaveFile, weaponId: string, targetLevel: number) {
  return previewWeaponUpgradeInternal(save, weaponId, targetLevel);
}

export function previewWeaponSkillUpgrade(save: SaveFile, weaponId: string, targetSkillLevel: number) {
  return previewWeaponSkillUpgradeInternal(save, weaponId, targetSkillLevel);
}

export function previewWeaponUncap(save: SaveFile, weaponId: string, targetUncap: number) {
  return previewWeaponUncapInternal(save, weaponId, targetUncap);
}

export function previewSummonUpgrade(save: SaveFile, summonId: string, targetLevel: number) {
  return previewSummonUpgradeInternal(save, summonId, targetLevel);
}

export function previewSummonUncap(save: SaveFile, summonId: string, targetUncap: number) {
  return previewSummonUncapInternal(save, summonId, targetUncap);
}

export function previewWeaponDismantle(save: SaveFile, weaponId: string): DismantlePreviewResult {
  assertOwned(save, 'weapon', weaponId);
  if (isWeaponEquipped(save, weaponId)) throw new Error('编成中的武器不能拆解');
  const weapon = findWeapon(weaponId);
  const state = normalizeWeaponState(save, weaponId);
  const rewards = createDismantleRewards({
    expMaterialId: WEAPON_EXP_MATERIAL,
    expCost: sumCostToLevel(state.level, 1, WEAPON_LEVEL_COSTS),
    skillMaterialId: WEAPON_SKILL_MATERIAL,
    skillCost: sumCostToSkill(state.skillLevel, 1),
    uncapMaterialId: WEAPON_UNCAP_MATERIAL,
    uncapCost: sumCostToUncap(state.uncap, 0, WEAPON_UNCAP_COSTS),
  });

  const next = cloneSave(save);
  next.inventory.weaponIds = next.inventory.weaponIds.filter((id) => id !== weaponId);
  delete next.weaponStates[weaponId];

  for (const reward of rewards) grantMaterial(next, reward.materialId, reward.quantity);

  return {
    save: next,
    action: 'weaponDismantle',
    itemId: weaponId,
    itemName: weapon.name,
    rewards,
  };
}

export function previewSummonDismantle(save: SaveFile, summonId: string): DismantlePreviewResult {
  assertOwned(save, 'summon', summonId);
  if (isSummonEquipped(save, summonId)) throw new Error('编成中的召唤不能拆解');
  const summon = findSummon(summonId);
  const state = normalizeSummonState(save, summonId);
  const rewards = createDismantleRewards({
    expMaterialId: SUMMON_EXP_MATERIAL,
    expCost: sumCostToLevel(state.level, 1, SUMMON_LEVEL_COSTS),
    uncapMaterialId: SUMMON_UNCAP_MATERIAL,
    uncapCost: sumCostToUncap(state.uncap, 0, SUMMON_UNCAP_COSTS),
  });

  const next = cloneSave(save);
  next.inventory.summonIds = next.inventory.summonIds.filter((id) => id !== summonId);
  delete next.summonStates[summonId];

  for (const reward of rewards) grantMaterial(next, reward.materialId, reward.quantity);

  return {
    save: next,
    action: 'summonDismantle',
    itemId: summonId,
    itemName: summon.name,
    rewards,
  };
}

export function applyCharacterExp(save: SaveFile, characterIds: string[], totalExp: number): SaveFile {
  const targetIds = characterIds.filter((id) => save.inventory.characterIds.includes(id));
  if (targetIds.length === 0) return save;

  const next = cloneSave(save);
  const expPerCharacter = Math.max(0, Number.isFinite(totalExp) ? totalExp : 0) / targetIds.length;

  for (const id of targetIds) {
    const character = findCharacter(id);
    const state = { ...normalizeCharacterState(next, id) };
    const cap = getCurrentCharacterLevelCap(character, state);
    state.exp += expPerCharacter;
    state.level = levelFromExp(state.exp, cap);
    state.levelCap = cap;
    next.characterStates[id] = state;
  }

  return next;
}

export function upgradeCharacter(save: SaveFile, characterId: string, targetLevel: number): SaveFile {
  return previewCharacterUpgrade(save, characterId, targetLevel).save;
}

export function uncapCharacter(save: SaveFile, characterId: string, targetUncap: number): SaveFile {
  return previewCharacterUncap(save, characterId, targetUncap).save;
}

export function upgradeWeapon(save: SaveFile, weaponId: string, targetLevel: number): SaveFile {
  return previewWeaponUpgrade(save, weaponId, targetLevel).save;
}

export function upgradeWeaponSkill(save: SaveFile, weaponId: string, targetSkillLevel: number): SaveFile {
  return previewWeaponSkillUpgrade(save, weaponId, targetSkillLevel).save;
}

export function uncapWeapon(save: SaveFile, weaponId: string, targetUncap: number): SaveFile {
  return previewWeaponUncap(save, weaponId, targetUncap).save;
}

export function dismantleWeapon(save: SaveFile, weaponId: string): SaveFile {
  return previewWeaponDismantle(save, weaponId).save;
}

export function upgradeSummon(save: SaveFile, summonId: string, targetLevel: number): SaveFile {
  return previewSummonUpgrade(save, summonId, targetLevel).save;
}

export function uncapSummon(save: SaveFile, summonId: string, targetUncap: number): SaveFile {
  return previewSummonUncap(save, summonId, targetUncap).save;
}

export function dismantleSummon(save: SaveFile, summonId: string): SaveFile {
  return previewSummonDismantle(save, summonId).save;
}
