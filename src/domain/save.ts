import { z } from 'zod';
import type { ExpeditionRun } from './expedition';

const ExpeditionRunSchema = z.object({
  id: z.string(),
  questId: z.string(),
  startedAt: z.number().finite(),
  endsAt: z.number().finite(),
  totalRuns: z.number().int().min(1).max(100),
  runDurationMs: z.number().finite().min(60_000),
});

export const SaveFileSchema = z.object({
  version: z.literal(1),
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

export type SaveFile = z.infer<typeof SaveFileSchema> & {
  activeRun: ExpeditionRun | null;
};

const INITIAL_CHARACTER_IDS = [
  'char-leya-ember-rail',
  'char-caro-furnace',
  'char-mira-astral-circuit',
  'char-noin-ash-protocol',
];

export function createInitialSave(now: number): SaveFile {
  const timestamp = Number.isFinite(now) ? now : 0;

  return {
    version: 1,
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
      materials: { 'ember-chip': 0, 'furnace-core': 0 },
      currencies: { crystal: 0, 'gacha-ticket': 0 },
    },
    activeRun: null,
  };
}

export function exportSave(save: SaveFile): string {
  const next = { ...save, updatedAt: Date.now() };
  return JSON.stringify(SaveFileSchema.parse(next), null, 2);
}

export function importSave(json: string): SaveFile {
  try {
    return SaveFileSchema.parse(JSON.parse(json)) as SaveFile;
  } catch {
    throw new Error('存档格式无效');
  }
}
