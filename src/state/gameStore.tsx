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
  dismantleSummon as dismantleSummonGrowth,
  dismantleWeapon as dismantleWeaponGrowth,
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
import {
  getInitialCharacterLevelCap,
  getInitialSummonLevelCap,
  getInitialWeaponLevelCap,
} from '../domain/progression';

export const storageKey = 'idle-gbf-save-v1';
const oneTimeMaterialGiftKey = 'idle-gbf-dev-material-gift-v1';

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
  upgradeCharacter: (characterId: string, targetLevel: number) => void;
  uncapCharacter: (characterId: string, targetUncap: number) => void;
  upgradeWeapon: (weaponId: string, targetLevel: number) => void;
  upgradeWeaponSkill: (weaponId: string, targetSkillLevel: number) => void;
  uncapWeapon: (weaponId: string, targetUncap: number) => void;
  dismantleWeapon: (weaponId: string) => void;
  upgradeSummon: (summonId: string, targetLevel: number) => void;
  uncapSummon: (summonId: string, targetUncap: number) => void;
  dismantleSummon: (summonId: string) => void;
  setCharacterSlot: (slotIndex: number, characterId: string) => void;
  setWeaponSlot: (slotIndex: number, weaponId: string | null) => void;
  setSummonSlot: (slotIndex: number, summonId: string | null) => void;
};

type GameProviderProps = {
  children: ReactNode;
  now?: () => number;
  random?: () => number;
};

const GameContext = createContext<GameContextValue | null>(null);

function readInitialSave(now: number): SaveFile {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return applyOneTimeMaterialGift(createInitialSave(now));

  try {
    return applyOneTimeMaterialGift(importSave(stored));
  } catch {
    return applyOneTimeMaterialGift(createInitialSave(now));
  }
}

function applyOneTimeMaterialGift(save: SaveFile): SaveFile {
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return save;
  if (localStorage.getItem(oneTimeMaterialGiftKey) === 'claimed') return save;

  const next: SaveFile = {
    ...save,
    updatedAt: Date.now(),
    inventory: {
      ...save.inventory,
      materials: {
        ...save.inventory.materials,
        'ember-chip': (save.inventory.materials['ember-chip'] ?? 0) + 50,
        'furnace-core': (save.inventory.materials['furnace-core'] ?? 0) + 50,
        'fire-character-exp': (save.inventory.materials['fire-character-exp'] ?? 0) + 50,
        'fire-character-uncap': (save.inventory.materials['fire-character-uncap'] ?? 0) + 20,
        'fire-weapon-exp': (save.inventory.materials['fire-weapon-exp'] ?? 0) + 50,
        'fire-weapon-skill': (save.inventory.materials['fire-weapon-skill'] ?? 0) + 50,
        'fire-weapon-uncap': (save.inventory.materials['fire-weapon-uncap'] ?? 0) + 20,
        'fire-summon-exp': (save.inventory.materials['fire-summon-exp'] ?? 0) + 50,
        'fire-summon-uncap': (save.inventory.materials['fire-summon-uncap'] ?? 0) + 20,
      },
    },
  };

  localStorage.setItem(storageKey, JSON.stringify(SaveFileSchema.parse(next), null, 2));
  localStorage.setItem(oneTimeMaterialGiftKey, 'claimed');
  return next;
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
  const weaponStates = { ...save.weaponStates };
  const summonStates = { ...save.summonStates };

  for (const reward of rewards) {
    assertPositiveIntegerRewardQuantity(reward.quantity);
    if (reward.kind === 'currency') {
      currencies[reward.itemId] = (currencies[reward.itemId] ?? 0) + reward.quantity;
    } else if (isMaterialRewardKind(reward.kind)) {
      materials[reward.itemId] = (materials[reward.itemId] ?? 0) + reward.quantity;
    } else if (reward.kind === 'weapon') {
      if (!weaponIds.includes(reward.itemId)) {
        weaponIds.push(reward.itemId);
        const weapon = initialWeapons.find((candidate) => candidate.id === reward.itemId);
        weaponStates[reward.itemId] = {
          level: weapon?.level ?? 1,
          exp: 0,
          uncap: 0,
          levelCap: getInitialWeaponLevelCap({ maxLevel: weapon?.maxLevel ?? 100, rarity: weapon?.rarity ?? 'SSR' }),
          skillLevel: weapon?.skills[0]?.level ?? 1,
        };
      }
    } else if (reward.kind === 'summon') {
      if (!summonIds.includes(reward.itemId)) {
        summonIds.push(reward.itemId);
        const summon = initialSummons.find((candidate) => candidate.id === reward.itemId);
        summonStates[reward.itemId] = {
          level: summon?.level ?? 1,
          exp: 0,
          uncap: 0,
          levelCap: getInitialSummonLevelCap({ maxLevel: summon?.maxLevel ?? 100, rarity: summon?.rarity ?? 'SSR' }),
        };
      }
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
    weaponStates,
    summonStates,
  };
}

function assertFormationIndex(index: number, size: number) {
  if (!Number.isInteger(index) || index < 0 || index >= size) throw new Error('编成槽位无效');
}

function swapFormationItem<T extends string | null>(items: T[], slotIndex: number, nextItemId: T) {
  const next = [...items];
  const replacedItemId = next[slotIndex];
  if (nextItemId === replacedItemId) return next;

  const existingIndex = nextItemId ? next.findIndex((itemId, index) => index !== slotIndex && itemId === nextItemId) : -1;
  next[slotIndex] = nextItemId;
  if (existingIndex >= 0) next[existingIndex] = replacedItemId;
  return next;
}

function swapFixedFormationItem(items: string[], slotIndex: number, nextItemId: string) {
  const next = [...items];
  const replacedItemId = next[slotIndex];
  if (nextItemId === replacedItemId) return next;

  const existingIndex = next.findIndex((itemId, index) => index !== slotIndex && itemId === nextItemId);
  next[slotIndex] = nextItemId;
  if (existingIndex >= 0) next[existingIndex] = replacedItemId;
  return next;
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
            allowPartialSettlement: true,
          });

          if (settlement.rewards.length === 0) {
            return {
              ...current,
              updatedAt: settledAt,
              activeRun: null,
            };
          }

          appliedRewards = settlement.rewards;
          const rewarded = addRewardsToInventory(current, settlement.rewards);
          const withCharacterExp = applyCharacterExp(
            rewarded,
            rewarded.formation.characterIds,
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
          const characterStates = { ...current.characterStates };
          const rewards: RewardStack[] = [];
          for (const result of pull.results) {
            if (result.kind === 'character') {
              if (!characterIds.includes(result.id)) {
                characterIds.push(result.id);
                const character = initialCharacters.find((candidate) => candidate.id === result.id);
                characterStates[result.id] = {
                  level: character?.level ?? 1,
                  exp: 0,
                  uncap: 0,
                  levelCap: getInitialCharacterLevelCap({ maxLevel: character?.maxLevel ?? 80 }),
                };
              }
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
              characterStates,
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
      upgradeCharacter(characterId, targetLevel) {
        updateSave((current) => ({ ...upgradeCharacterGrowth(current, characterId, targetLevel), updatedAt: now() }));
      },
      uncapCharacter(characterId, targetUncap) {
        updateSave((current) => ({ ...uncapCharacterGrowth(current, characterId, targetUncap), updatedAt: now() }));
      },
      upgradeWeapon(weaponId, targetLevel) {
        updateSave((current) => ({ ...upgradeWeaponGrowth(current, weaponId, targetLevel), updatedAt: now() }));
      },
      upgradeWeaponSkill(weaponId, targetSkillLevel) {
        updateSave((current) => ({ ...upgradeWeaponSkillGrowth(current, weaponId, targetSkillLevel), updatedAt: now() }));
      },
      uncapWeapon(weaponId, targetUncap) {
        updateSave((current) => ({ ...uncapWeaponGrowth(current, weaponId, targetUncap), updatedAt: now() }));
      },
      dismantleWeapon(weaponId) {
        updateSave((current) => ({ ...dismantleWeaponGrowth(current, weaponId), updatedAt: now() }));
      },
      upgradeSummon(summonId, targetLevel) {
        updateSave((current) => ({ ...upgradeSummonGrowth(current, summonId, targetLevel), updatedAt: now() }));
      },
      uncapSummon(summonId, targetUncap) {
        updateSave((current) => ({ ...uncapSummonGrowth(current, summonId, targetUncap), updatedAt: now() }));
      },
      dismantleSummon(summonId) {
        updateSave((current) => ({ ...dismantleSummonGrowth(current, summonId), updatedAt: now() }));
      },
      setCharacterSlot(slotIndex, characterId) {
        assertFormationIndex(slotIndex, 4);
        updateSave((current) => {
          if (!current.inventory.characterIds.includes(characterId)) throw new Error('角色未持有');
          const characterIds = swapFixedFormationItem(current.formation.characterIds, slotIndex, characterId);
          return {
            ...current,
            updatedAt: now(),
            formation: {
              ...current.formation,
              characterIds,
            },
          };
        });
      },
      setWeaponSlot(slotIndex, weaponId) {
        assertFormationIndex(slotIndex, 10);
        updateSave((current) => {
          if (weaponId && !current.inventory.weaponIds.includes(weaponId)) throw new Error('武器未持有');
          const weaponIds = swapFormationItem(current.formation.weaponIds, slotIndex, weaponId);
          return {
            ...current,
            updatedAt: now(),
            formation: {
              ...current.formation,
              weaponIds,
            },
          };
        });
      },
      setSummonSlot(slotIndex, summonId) {
        assertFormationIndex(slotIndex, 5);
        updateSave((current) => {
          if (summonId && !current.inventory.summonIds.includes(summonId)) throw new Error('召唤石未持有');
          const summonIds = swapFormationItem(current.formation.summonIds, slotIndex, summonId);
          return {
            ...current,
            updatedAt: now(),
            formation: {
              ...current.formation,
              summonIds,
            },
          };
        });
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
