import { z } from 'zod';
import { initialCharacters, initialSummons, initialWeapons } from './content';
import type { ExpeditionRun } from './expedition';

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
  level: z.number().int().min(1).max(100),
  exp: z.number().finite().nonnegative(),
  uncap: z.number().int().min(0).max(10),
  levelCap: z.number().int().min(1).max(100),
});

const WeaponStateSchema = GrowthStateSchema.extend({
  skillLevel: z.number().int().min(1).max(20),
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

export const SaveFileSchema = BaseSaveFileSchema.extend({
  version: z.literal(2),
  characterStates: z.record(z.string(), GrowthStateSchema),
  weaponStates: z.record(z.string(), WeaponStateSchema),
  summonStates: z.record(z.string(), GrowthStateSchema),
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
          levelCap: Math.min(100, character?.maxLevel ?? 80),
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
          levelCap: Math.min(100, weapon?.maxLevel ?? 100),
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
          levelCap: Math.min(100, summon?.maxLevel ?? 100),
        },
      ];
    }),
  );
}

export function createInitialSave(now: number): SaveFile {
  const timestamp = Number.isFinite(now) ? now : 0;

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
      weaponIds: ['weapon-red-rail-saber', 'weapon-furnace-grid-blade'],
      summonIds: ['summon-helios-engine', 'summon-aurora-core'],
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
    weaponStates: createWeaponStates(),
    summonStates: createSummonStates(),
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
    return SaveFileSchema.parse(parsed) as SaveFile;
  } catch {
    throw new Error('存档格式无效');
  }
}
