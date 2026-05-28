import { z } from 'zod';
import { initialCharacters, initialSummons, initialWeapons } from './content';
import type { ExpeditionRun } from './expedition';
import {
  getInitialCharacterLevelCap,
  getInitialSummonLevelCap,
  getInitialWeaponLevelCap,
  shouldNormalizeLegacyEquipmentCap,
} from './progression';

const ExpeditionRunSchema = z.object({
  id: z.string(),
  questId: z.string(),
  startedAt: z.number().finite(),
  endsAt: z.number().finite(),
  totalRuns: z.number().int().min(1).max(100),
  runDurationMs: z.number().finite().min(60_000),
  settledAt: z.number().finite().optional(),
});

const GrowthStateSchema = z.object({
  level: z.number().int().min(1).max(150),
  exp: z.number().finite().nonnegative(),
  uncap: z.number().int().min(0).max(10),
  levelCap: z.number().int().min(1).max(150),
});

const WeaponStateSchema = GrowthStateSchema.extend({
  skillLevel: z.number().int().min(1).max(20),
});

const LegacyFormationSchema = z.object({
  weaponIds: z.array(z.string().nullable()).length(10),
  summonIds: z.array(z.string().nullable()).length(5),
});

const FormationSchema = z.object({
  characterIds: z.array(z.string()).length(4),
  weaponIds: z.array(z.string().nullable()).length(10),
  summonIds: z.array(z.string().nullable()).length(5),
});

const BaseSaveFileSchema = z.object({
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
  progress: z.object({
    clearedQuestIds: z.array(z.string()),
    unlockedCharacterIds: z.array(z.string()),
  }),
  inventory: z.object({
    characterIds: z.array(z.string()),
    weaponIds: z.array(z.string()),
    summonIds: z.array(z.string()),
    materials: z.record(z.string(), z.number().finite().nonnegative()),
    currencies: z.record(z.string(), z.number().finite().nonnegative()),
  }),
  activeRun: ExpeditionRunSchema.nullable(),
});

const SaveFileV1Schema = BaseSaveFileSchema.extend({
  version: z.literal(1),
});

const SaveFileV2Schema = BaseSaveFileSchema.extend({
  version: z.literal(2),
  characterStates: z.record(z.string(), GrowthStateSchema),
  weaponStates: z.record(z.string(), WeaponStateSchema),
  summonStates: z.record(z.string(), GrowthStateSchema),
  formation: z.union([FormationSchema, LegacyFormationSchema]).optional(),
});

export const SaveFileSchema = SaveFileV2Schema.extend({
  formation: FormationSchema,
});

export type SaveFile = z.infer<typeof SaveFileSchema> & {
  activeRun: ExpeditionRun | null;
};

const INITIAL_CHARACTER_IDS = [
  'char-leya-ember-rail',
  'char-caro-furnace',
  'char-mira-astral-circuit',
  'char-noin-ash-protocol',
];

function createCharacterStates(characterIds = INITIAL_CHARACTER_IDS) {
  return Object.fromEntries(
    characterIds.map((id) => {
      const character = initialCharacters.find((candidate) => candidate.id === id);
      return [
        id,
        {
          level: character?.level ?? 1,
          exp: 0,
          uncap: 0,
          levelCap: getInitialCharacterLevelCap({ maxLevel: character?.maxLevel ?? 80 }),
        },
      ];
    }),
  );
}

function createWeaponStates(weaponIds = ['weapon-red-rail-saber', 'weapon-furnace-grid-blade']) {
  return Object.fromEntries(
    weaponIds.map((id) => {
      const weapon = initialWeapons.find((candidate) => candidate.id === id);
      return [
        id,
        {
          level: weapon?.level ?? 1,
          exp: 0,
          uncap: 0,
          levelCap: getInitialWeaponLevelCap({ maxLevel: weapon?.maxLevel ?? 100, rarity: weapon?.rarity ?? 'SSR' }),
          skillLevel: weapon?.skills[0]?.level ?? 1,
        },
      ];
    }),
  );
}

function createSummonStates(summonIds = ['summon-helios-engine', 'summon-aurora-core']) {
  return Object.fromEntries(
    summonIds.map((id) => {
      const summon = initialSummons.find((candidate) => candidate.id === id);
      return [
        id,
        {
          level: summon?.level ?? 1,
          exp: 0,
          uncap: 0,
          levelCap: getInitialSummonLevelCap({ maxLevel: summon?.maxLevel ?? 100, rarity: summon?.rarity ?? 'SSR' }),
        },
      ];
    }),
  );
}

function createFormationSlots(itemIds: string[], size: number) {
  return Array.from({ length: size }, (_, index) => itemIds[index] ?? null);
}

function createCharacterFormationSlots(characterIds: string[], size: number) {
  const uniqueIds = Array.from(new Set([...characterIds, ...INITIAL_CHARACTER_IDS]));
  const fallbackId = uniqueIds[0] ?? INITIAL_CHARACTER_IDS[0];

  return Array.from({ length: size }, (_, index) => uniqueIds[index] ?? fallbackId);
}

function createDefaultFormation(characterIds: string[], weaponIds: string[], summonIds: string[]) {
  return {
    characterIds: createCharacterFormationSlots(characterIds, 4),
    weaponIds: createFormationSlots(weaponIds, 10),
    summonIds: createFormationSlots(summonIds, 5),
  };
}

export function createInitialSave(now: number): SaveFile {
  const timestamp = Number.isFinite(now) ? now : 0;
  const weaponIds = ['weapon-red-rail-saber', 'weapon-furnace-grid-blade'];
  const summonIds = ['summon-helios-engine', 'summon-aurora-core'];

  return {
    version: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    progress: {
      clearedQuestIds: [],
      unlockedCharacterIds: [...INITIAL_CHARACTER_IDS],
    },
    inventory: {
      characterIds: [...INITIAL_CHARACTER_IDS],
      weaponIds,
      summonIds,
      materials: {
        'ember-chip': 0,
        'furnace-core': 0,
        'fire-character-exp': 0,
        'fire-character-uncap': 0,
        'fire-weapon-exp': 0,
        'fire-weapon-skill': 0,
        'fire-weapon-uncap': 0,
        'fire-summon-exp': 0,
        'fire-summon-uncap': 0,
      },
      currencies: { crystal: 0, 'gacha-ticket': 0 },
    },
    characterStates: createCharacterStates(),
    weaponStates: createWeaponStates(weaponIds),
    summonStates: createSummonStates(summonIds),
    formation: createDefaultFormation(INITIAL_CHARACTER_IDS, weaponIds, summonIds),
    activeRun: null,
  };
}

function migrateSaveV1(save: z.infer<typeof SaveFileV1Schema>): SaveFile {
  return SaveFileSchema.parse({
    ...save,
    version: 2,
    inventory: {
      ...save.inventory,
      materials: {
        'ember-chip': 0,
        'furnace-core': 0,
        'fire-character-exp': 0,
        'fire-character-uncap': 0,
        'fire-weapon-exp': 0,
        'fire-weapon-skill': 0,
        'fire-weapon-uncap': 0,
        'fire-summon-exp': 0,
        'fire-summon-uncap': 0,
        ...save.inventory.materials,
      },
      currencies: {
        crystal: 0,
        'gacha-ticket': 0,
        ...save.inventory.currencies,
      },
    },
    characterStates: createCharacterStates(save.inventory.characterIds),
    weaponStates: createWeaponStates(save.inventory.weaponIds),
    summonStates: createSummonStates(save.inventory.summonIds),
    formation: createDefaultFormation(save.inventory.characterIds, save.inventory.weaponIds, save.inventory.summonIds),
  }) as SaveFile;
}

function migrateSaveV2(save: z.infer<typeof SaveFileV2Schema>): SaveFile {
  const legacyFormation = save.formation;
  const weaponStates = Object.fromEntries(
    Object.entries(save.weaponStates).map(([weaponId, state]) => {
      const weapon = initialWeapons.find((candidate) => candidate.id === weaponId);
      if (!weapon || !shouldNormalizeLegacyEquipmentCap({ ...state, maxLevel: weapon.maxLevel, expectedBaseCap: getInitialWeaponLevelCap(weapon) })) {
        return [weaponId, state];
      }
      return [weaponId, { ...state, levelCap: getInitialWeaponLevelCap({ maxLevel: weapon.maxLevel, rarity: weapon.rarity }) }];
    }),
  );
  const summonStates = Object.fromEntries(
    Object.entries(save.summonStates).map(([summonId, state]) => {
      const summon = initialSummons.find((candidate) => candidate.id === summonId);
      if (!summon || !shouldNormalizeLegacyEquipmentCap({ ...state, maxLevel: summon.maxLevel, expectedBaseCap: getInitialSummonLevelCap(summon) })) {
        return [summonId, state];
      }
      return [summonId, { ...state, levelCap: getInitialSummonLevelCap({ maxLevel: summon.maxLevel, rarity: summon.rarity }) }];
    }),
  );

  return SaveFileSchema.parse({
    ...save,
    weaponStates,
    summonStates,
    formation: legacyFormation
      ? {
          characterIds:
            'characterIds' in legacyFormation
              ? createCharacterFormationSlots(legacyFormation.characterIds, 4)
              : createCharacterFormationSlots(save.inventory.characterIds, 4),
          weaponIds: legacyFormation.weaponIds,
          summonIds: legacyFormation.summonIds,
        }
      : createDefaultFormation(save.inventory.characterIds, save.inventory.weaponIds, save.inventory.summonIds),
  }) as SaveFile;
}

export function exportSave(save: SaveFile): string {
  const next = { ...save, updatedAt: Date.now() };
  return JSON.stringify(SaveFileSchema.parse(next), null, 2);
}

export function importSave(json: string): SaveFile {
  try {
    const parsed = JSON.parse(json);
    const version = typeof parsed === 'object' && parsed !== null ? parsed.version : undefined;
    if (version === 1) return migrateSaveV1(SaveFileV1Schema.parse(parsed));
    if (version === 2) return migrateSaveV2(SaveFileV2Schema.parse(parsed));
    return SaveFileSchema.parse(parsed) as SaveFile;
  } catch {
    throw new Error('存档格式无效');
  }
}
