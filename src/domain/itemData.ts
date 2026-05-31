import { initialCharacters, initialSummons, initialWeapons } from './content';
import type { RewardKind, RewardTableEntry } from './types';

const currencyLabels: Record<string, string> = {
  crystal: '宝晶石',
  'gacha-ticket': '抽卡券',
};

const materialLabels: Record<string, string> = {
  'ember-chip': '余烬芯片',
  'furnace-core': '炉心核心',
  'fire-character-exp': '角色经验素材',
  'fire-character-uncap': '角色突破素材',
  'fire-weapon-exp': '武器经验合金',
  'fire-weapon-skill': '词条回路片',
  'fire-weapon-uncap': '武器突破块',
  'fire-summon-exp': '召唤石经验晶',
  'fire-summon-uncap': '召唤石突破核',
};

const materialKinds = new Set<RewardKind>([
  'material',
  'characterExp',
  'weaponExpMaterial',
  'summonExpMaterial',
  'weaponSkillMaterial',
  'characterUncapMaterial',
  'weaponUncapMaterial',
  'summonUncapMaterial',
]);

export function getCurrencyLabel(itemId: string) {
  return currencyLabels[itemId] ?? itemId;
}

export function getMaterialLabel(itemId: string) {
  return materialLabels[itemId] ?? itemId;
}

export function getRewardLabel(input: Pick<RewardTableEntry, 'kind' | 'itemId'>) {
  if (input.kind === 'currency') return getCurrencyLabel(input.itemId);
  if (materialKinds.has(input.kind)) return getMaterialLabel(input.itemId);
  if (input.kind === 'weapon') return initialWeapons.find((weapon) => weapon.id === input.itemId)?.name ?? input.itemId;
  if (input.kind === 'summon') return initialSummons.find((summon) => summon.id === input.itemId)?.name ?? input.itemId;
  return initialCharacters.find((character) => character.id === input.itemId)?.name ?? input.itemId;
}
