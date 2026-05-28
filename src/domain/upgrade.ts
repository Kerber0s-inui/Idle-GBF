import type { Character, Weapon } from './types';

export type MaterialBag = Record<string, number>;

function consume(materials: MaterialBag, itemId: string, quantity: number) {
  if ((materials[itemId] ?? 0) < quantity) throw new Error(`素材不足：${itemId}`);
  return { ...materials, [itemId]: (materials[itemId] ?? 0) - quantity };
}

export function upgradeCharacterLevel(input: { character: Character; materials: MaterialBag }) {
  if (input.character.level >= input.character.maxLevel) return input;
  return {
    character: {
      ...input.character,
      level: input.character.level + 1,
      stats: { ...input.character.stats, hp: input.character.stats.hp + 18, atk: input.character.stats.atk + 12 },
    },
    materials: consume(input.materials, 'ember-chip', 1),
  };
}

export function upgradeWeaponSkill(input: { weapon: Weapon; materials: MaterialBag }) {
  const firstSkill = input.weapon.skills[0];
  if (!firstSkill) return input;
  return {
    weapon: {
      ...input.weapon,
      skills: [
        {
          ...firstSkill,
          level: firstSkill.level + 1,
          modifiers: firstSkill.modifiers.map((modifier) => ({ ...modifier, value: modifier.value + 0.01 })),
        },
        ...input.weapon.skills.slice(1),
      ],
    },
    materials: consume(input.materials, 'furnace-core', 1),
  };
}
