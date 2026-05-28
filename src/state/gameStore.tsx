import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { initialQuests } from '../domain/content';
import {
  createSweepRun,
  getSweepProgress as getDomainSweepProgress,
  settleSweepRun,
  type SweepProgress,
} from '../domain/expedition';
import type { RewardStack } from '../domain/rewards';
import { createInitialSave, importSave, SaveFileSchema, type SaveFile } from '../domain/save';

export const storageKey = 'idle-gbf-save-v1';

type GameContextValue = {
  save: SaveFile;
  markQuestCleared: (questId: string) => void;
  startSweep: (questId: string, count: number) => void;
  exportCurrentSave: () => string;
  importSaveJson: (json: string) => void;
  getSweepProgress: (nowOverride?: number) => SweepProgress | null;
  settleActiveSweep: (nowOverride?: number) => RewardStack[];
  addCurrency: (itemId: string, quantity: number) => void;
  addMaterial: (itemId: string, quantity: number) => void;
};

type GameProviderProps = {
  children: ReactNode;
  now?: () => number;
  random?: () => number;
};

const GameContext = createContext<GameContextValue | null>(null);

function readInitialSave(now: number): SaveFile {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return createInitialSave(now);

  try {
    return importSave(stored);
  } catch {
    return createInitialSave(now);
  }
}

function persistSave(next: SaveFile) {
  localStorage.setItem(storageKey, serializeSave(next));
  return next;
}

function serializeSave(save: SaveFile): string {
  return JSON.stringify(SaveFileSchema.parse(save), null, 2);
}

function addRewardsToInventory(save: SaveFile, rewards: RewardStack[]): SaveFile {
  const currencies = { ...save.inventory.currencies };
  const materials = { ...save.inventory.materials };
  const weaponIds = [...save.inventory.weaponIds];
  const summonIds = [...save.inventory.summonIds];

  for (const reward of rewards) {
    if (reward.kind === 'currency') {
      currencies[reward.itemId] = (currencies[reward.itemId] ?? 0) + reward.quantity;
    } else if (reward.kind === 'material') {
      materials[reward.itemId] = (materials[reward.itemId] ?? 0) + reward.quantity;
    } else if (reward.kind === 'weapon') {
      if (!weaponIds.includes(reward.itemId)) weaponIds.push(reward.itemId);
    } else if (reward.kind === 'summon') {
      if (!summonIds.includes(reward.itemId)) summonIds.push(reward.itemId);
    }
  }

  return {
    ...save,
    inventory: {
      ...save.inventory,
      currencies,
      materials,
      weaponIds,
      summonIds,
    },
  };
}

export function GameProvider({ children, now = () => Date.now(), random = Math.random }: GameProviderProps) {
  const initialSaveRef = useRef<SaveFile | null>(null);
  if (!initialSaveRef.current) initialSaveRef.current = readInitialSave(now());

  const saveRef = useRef<SaveFile>(initialSaveRef.current);
  const [save, setSave] = useState<SaveFile>(initialSaveRef.current);

  const value = useMemo<GameContextValue>(() => {
    const updateSave = (producer: (current: SaveFile) => SaveFile) => {
      const next = producer(saveRef.current);
      if (next === saveRef.current) return next;

      persistSave(next);
      saveRef.current = next;
      setSave(next);
      return next;
    };

    return {
      save,
      markQuestCleared(questId) {
        updateSave((current) => {
          if (current.progress.clearedQuestIds.includes(questId)) {
            return { ...current, updatedAt: now() };
          }

          return {
            ...current,
            updatedAt: now(),
            progress: {
              ...current.progress,
              clearedQuestIds: [...current.progress.clearedQuestIds, questId],
            },
          };
        });
      },
      startSweep(questId, count) {
        const quest = initialQuests.find((candidate) => candidate.id === questId);
        if (!quest) throw new Error('副本不存在');

        updateSave((current) => {
          if (!current.progress.clearedQuestIds.includes(questId)) throw new Error('副本未首通');

          const startedAt = now();
          return {
            ...current,
            updatedAt: startedAt,
            activeRun: createSweepRun({
              quest,
              requestedRuns: count,
              startedAt,
              sweepEfficiency: 0,
            }),
          };
        });
      },
      exportCurrentSave() {
        return serializeSave(saveRef.current);
      },
      importSaveJson(json) {
        const imported = importSave(json);
        saveRef.current = persistSave(imported);
        setSave(saveRef.current);
      },
      getSweepProgress(nowOverride) {
        if (!saveRef.current.activeRun) return null;
        return getDomainSweepProgress({ run: saveRef.current.activeRun, now: nowOverride ?? now() });
      },
      settleActiveSweep(nowOverride) {
        const settledAt = nowOverride ?? now();
        let appliedRewards: RewardStack[] = [];

        updateSave((current) => {
          if (!current.activeRun) return current;

          const quest = initialQuests.find((candidate) => candidate.id === current.activeRun?.questId);
          if (!quest) return current;

          const settlement = settleSweepRun({
            run: current.activeRun,
            quest,
            now: settledAt,
            dropRateBonus: 0,
            random,
          });

          if (!settlement.isComplete) {
            return {
              ...current,
              updatedAt: settledAt,
              activeRun: settlement.run,
            };
          }

          if (settlement.rewards.length === 0) {
            return {
              ...current,
              updatedAt: settledAt,
              activeRun: settlement.run.settledAt ? null : settlement.run,
            };
          }

          appliedRewards = settlement.rewards;
          return {
            ...addRewardsToInventory(current, settlement.rewards),
            updatedAt: settledAt,
            activeRun: null,
          };
        });

        return appliedRewards;
      },
      addCurrency(itemId, quantity) {
        updateSave((current) => ({
          ...current,
          updatedAt: now(),
          inventory: {
            ...current.inventory,
            currencies: {
              ...current.inventory.currencies,
              [itemId]: (current.inventory.currencies[itemId] ?? 0) + quantity,
            },
          },
        }));
      },
      addMaterial(itemId, quantity) {
        updateSave((current) => ({
          ...current,
          updatedAt: now(),
          inventory: {
            ...current.inventory,
            materials: {
              ...current.inventory.materials,
              [itemId]: (current.inventory.materials[itemId] ?? 0) + quantity,
            },
          },
        }));
      },
    };
  }, [save, now, random]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
