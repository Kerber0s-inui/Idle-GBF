import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { initialCharacters, initialQuests, initialSummons, initialWeapons } from '../domain/content';
import {
  createSweepRun,
  getSweepProgress as getDomainSweepProgress,
  settleSweepRun,
  type SweepProgress,
} from '../domain/expedition';
import { createInitialGachaPool, pullGacha, type GachaPoolItem } from '../domain/gacha';
import {
  applyCharacterExp,
  uncapCharacter as uncapCharacterGrowth,
  uncapSummon as uncapSummonGrowth,
  uncapWeapon as uncapWeaponGrowth,
  upgradeCharacter as upgradeCharacterGrowth,
  upgradeSummon as upgradeSummonGrowth,
  upgradeWeapon as upgradeWeaponGrowth,
  upgradeWeaponSkill as upgradeWeaponSkillGrowth,
} from '../domain/growth';
import type { RewardStack } from '../domain/rewards';
import { createInitialSave, importSave, SaveFileSchema, type SaveFile } from '../domain/save';
import type { RewardKind } from '../domain/types';

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
  grantRewards: (rewards: RewardStack[]) => void;
  pullFromGacha: (count: 1 | 10) => GachaPoolItem[];
  upgradeCharacter: (characterId: string) => void;
  uncapCharacter: (characterId: string) => void;
  upgradeWeapon: (weaponId: string) => void;
  upgradeWeaponSkill: (weaponId: string) => void;
  uncapWeapon: (weaponId: string) => void;
  upgradeSummon: (summonId: string) => void;
  uncapSummon: (summonId: string) => void;
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

function assertPositiveIntegerQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('资源数量无效');
}

function assertPositiveIntegerRewardQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('奖励数量无效');
}

const materialRewardKinds = new Set<RewardKind>([
  'material',
  'characterExp',
  'weaponExpMaterial',
  'summonExpMaterial',
  'weaponSkillMaterial',
  'characterUncapMaterial',
  'weaponUncapMaterial',
  'summonUncapMaterial',
]);

function isMaterialRewardKind(kind: RewardKind) {
  return materialRewardKinds.has(kind);
}

function addRewardsToInventory(save: SaveFile, rewards: RewardStack[]): SaveFile {
  const currencies = { ...save.inventory.currencies };
  const materials = { ...save.inventory.materials };
  const weaponIds = [...save.inventory.weaponIds];
  const summonIds = [...save.inventory.summonIds];

  for (const reward of rewards) {
    assertPositiveIntegerRewardQuantity(reward.quantity);
    if (reward.kind === 'currency') {
      currencies[reward.itemId] = (currencies[reward.itemId] ?? 0) + reward.quantity;
    } else if (isMaterialRewardKind(reward.kind)) {
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
          if (current.activeRun) throw new Error('已有周回进行中');

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
          if (!quest) {
            return {
              ...current,
              updatedAt: settledAt,
              activeRun: null,
            };
          }

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
          const rewarded = addRewardsToInventory(current, settlement.rewards);
          const withCharacterExp = applyCharacterExp(
            rewarded,
            rewarded.inventory.characterIds.slice(0, 4),
            quest.difficulty * 100 * settlement.completedRuns,
          );
          return {
            ...withCharacterExp,
            updatedAt: settledAt,
            activeRun: null,
          };
        });

        return appliedRewards;
      },
      addCurrency(itemId, quantity) {
        assertPositiveIntegerQuantity(quantity);

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
        assertPositiveIntegerQuantity(quantity);

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
      grantRewards(rewards) {
        updateSave((current) => ({
          ...addRewardsToInventory(current, rewards),
          updatedAt: now(),
        }));
      },
      pullFromGacha(count) {
        let results: GachaPoolItem[] = [];

        updateSave((current) => {
          const pull = pullGacha({
            pool: createInitialGachaPool(initialCharacters, initialWeapons, initialSummons),
            crystals: current.inventory.currencies.crystal ?? 0,
            tickets: current.inventory.currencies['gacha-ticket'] ?? 0,
            count,
            random,
          });
          results = pull.results;

          const characterIds = [...current.inventory.characterIds];
          const rewards: RewardStack[] = [];
          for (const result of pull.results) {
            if (result.kind === 'character') {
              if (!characterIds.includes(result.id)) characterIds.push(result.id);
            } else {
              rewards.push({ itemId: result.id, kind: result.kind, quantity: 1 });
            }
          }

          const rewarded = addRewardsToInventory(
            {
              ...current,
              inventory: {
                ...current.inventory,
                characterIds,
                currencies: {
                  ...current.inventory.currencies,
                  crystal: pull.remainingCrystals,
                  'gacha-ticket': pull.remainingTickets,
                },
              },
            },
            rewards,
          );

          return {
            ...rewarded,
            updatedAt: now(),
          };
        });

        return results;
      },
      upgradeCharacter(characterId) {
        updateSave((current) => ({ ...upgradeCharacterGrowth(current, characterId), updatedAt: now() }));
      },
      uncapCharacter(characterId) {
        updateSave((current) => ({ ...uncapCharacterGrowth(current, characterId), updatedAt: now() }));
      },
      upgradeWeapon(weaponId) {
        updateSave((current) => ({ ...upgradeWeaponGrowth(current, weaponId), updatedAt: now() }));
      },
      upgradeWeaponSkill(weaponId) {
        updateSave((current) => ({ ...upgradeWeaponSkillGrowth(current, weaponId), updatedAt: now() }));
      },
      uncapWeapon(weaponId) {
        updateSave((current) => ({ ...uncapWeaponGrowth(current, weaponId), updatedAt: now() }));
      },
      upgradeSummon(summonId) {
        updateSave((current) => ({ ...upgradeSummonGrowth(current, summonId), updatedAt: now() }));
      },
      uncapSummon(summonId) {
        updateSave((current) => ({ ...uncapSummonGrowth(current, summonId), updatedAt: now() }));
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
