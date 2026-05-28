import type { SaveFile } from './save';

const MAX_LEVEL = 100;
const CHARACTER_EXP_MATERIAL = 'fire-character-exp';
const CHARACTER_UNCAP_MATERIAL = 'fire-character-uncap';
const WEAPON_EXP_MATERIAL = 'fire-weapon-exp';
const WEAPON_SKILL_MATERIAL = 'fire-weapon-skill';
const WEAPON_UNCAP_MATERIAL = 'fire-weapon-uncap';
const SUMMON_EXP_MATERIAL = 'fire-summon-exp';
const SUMMON_UNCAP_MATERIAL = 'fire-summon-uncap';

function cloneSave(save: SaveFile): SaveFile {
  return {
    ...save,
    progress: { ...save.progress, clearedQuestIds: [...save.progress.clearedQuestIds], unlockedCharacterIds: [...save.progress.unlockedCharacterIds] },
    inventory: {
      ...save.inventory,
      characterIds: [...save.inventory.characterIds],
      weaponIds: [...save.inventory.weaponIds],
      summonIds: [...save.inventory.summonIds],
      materials: { ...save.inventory.materials },
      currencies: { ...save.inventory.currencies },
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

function normalizeCharacterState(save: SaveFile, characterId: string) {
  return save.characterStates[characterId] ?? { level: 1, exp: 0, uncap: 0, levelCap: 80 };
}

function normalizeWeaponState(save: SaveFile, weaponId: string) {
  return save.weaponStates[weaponId] ?? { level: 1, exp: 0, uncap: 0, levelCap: 100, skillLevel: 1 };
}

function normalizeSummonState(save: SaveFile, summonId: string) {
  return save.summonStates[summonId] ?? { level: 1, exp: 0, uncap: 0, levelCap: 100 };
}

function spendMaterial(save: SaveFile, materialId: string, quantity: number) {
  const current = save.inventory.materials[materialId] ?? 0;
  if (current < quantity) throw new Error('材料不足');
  save.inventory.materials[materialId] = current - quantity;
}

export function applyCharacterExp(save: SaveFile, characterIds: string[], totalExp: number): SaveFile {
  const targetIds = characterIds.filter((id) => save.inventory.characterIds.includes(id));
  if (targetIds.length === 0) return save;

  const next = cloneSave(save);
  const expPerCharacter = Math.max(0, Number.isFinite(totalExp) ? totalExp : 0) / targetIds.length;

  for (const id of targetIds) {
    const state = { ...normalizeCharacterState(next, id) };
    state.exp += expPerCharacter;
    state.level = levelFromExp(state.exp, state.levelCap);
    next.characterStates[id] = state;
  }

  return next;
}

export function upgradeCharacter(save: SaveFile, characterId: string): SaveFile {
  if (!save.inventory.characterIds.includes(characterId)) throw new Error('角色未持有');

  const next = cloneSave(save);
  spendMaterial(next, CHARACTER_EXP_MATERIAL, 1);

  const state = { ...normalizeCharacterState(next, characterId) };
  state.exp += 1000;
  state.level = levelFromExp(state.exp, state.levelCap);
  next.characterStates[characterId] = state;

  return next;
}

export function uncapCharacter(save: SaveFile, characterId: string): SaveFile {
  if (!save.inventory.characterIds.includes(characterId)) throw new Error('角色未持有');

  const next = cloneSave(save);
  spendMaterial(next, CHARACTER_UNCAP_MATERIAL, 1);

  const state = { ...normalizeCharacterState(next, characterId) };
  state.uncap += 1;
  state.levelCap = Math.min(MAX_LEVEL, state.levelCap + 10);
  state.level = levelFromExp(state.exp, state.levelCap);
  next.characterStates[characterId] = state;

  return next;
}

export function upgradeWeapon(save: SaveFile, weaponId: string): SaveFile {
  if (!save.inventory.weaponIds.includes(weaponId)) throw new Error('武器未持有');

  const next = cloneSave(save);
  spendMaterial(next, WEAPON_EXP_MATERIAL, 1);

  const state = { ...normalizeWeaponState(next, weaponId) };
  state.exp += 1000;
  state.level = levelFromExp(state.exp, state.levelCap);
  next.weaponStates[weaponId] = state;

  return next;
}

export function upgradeWeaponSkill(save: SaveFile, weaponId: string): SaveFile {
  if (!save.inventory.weaponIds.includes(weaponId)) throw new Error('武器未持有');

  const next = cloneSave(save);
  spendMaterial(next, WEAPON_SKILL_MATERIAL, 1);

  const state = { ...normalizeWeaponState(next, weaponId) };
  state.skillLevel = Math.min(20, state.skillLevel + 1);
  next.weaponStates[weaponId] = state;

  return next;
}

export function uncapWeapon(save: SaveFile, weaponId: string): SaveFile {
  if (!save.inventory.weaponIds.includes(weaponId)) throw new Error('武器未持有');

  const next = cloneSave(save);
  spendMaterial(next, WEAPON_UNCAP_MATERIAL, 1);

  const state = { ...normalizeWeaponState(next, weaponId) };
  state.uncap += 1;
  state.levelCap = Math.min(MAX_LEVEL, state.levelCap + 10);
  state.level = levelFromExp(state.exp, state.levelCap);
  next.weaponStates[weaponId] = state;

  return next;
}

export function upgradeSummon(save: SaveFile, summonId: string): SaveFile {
  if (!save.inventory.summonIds.includes(summonId)) throw new Error('召唤石未持有');

  const next = cloneSave(save);
  spendMaterial(next, SUMMON_EXP_MATERIAL, 1);

  const state = { ...normalizeSummonState(next, summonId) };
  state.exp += 1000;
  state.level = levelFromExp(state.exp, state.levelCap);
  next.summonStates[summonId] = state;

  return next;
}

export function uncapSummon(save: SaveFile, summonId: string): SaveFile {
  if (!save.inventory.summonIds.includes(summonId)) throw new Error('召唤石未持有');

  const next = cloneSave(save);
  spendMaterial(next, SUMMON_UNCAP_MATERIAL, 1);

  const state = { ...normalizeSummonState(next, summonId) };
  state.uncap += 1;
  state.levelCap = Math.min(MAX_LEVEL, state.levelCap + 10);
  state.level = levelFromExp(state.exp, state.levelCap);
  next.summonStates[summonId] = state;

  return next;
}
