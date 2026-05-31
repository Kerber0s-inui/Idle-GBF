import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { GameProvider, useGame } from './gameStore';
import { createInitialSave, exportSave } from '../domain/save';

const storageKey = 'idle-gbf-save-v1';

beforeEach(() => localStorage.clear());

describe('game store', () => {
  it('creates a default save and starts a sweep after clearing a quest', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.markQuestCleared('quest-main-1'));
    act(() => result.current.startSweep('quest-main-1', 5));

    expect(result.current.save.progress.clearedQuestIds).toContain('quest-main-1');
    expect(result.current.save.activeRun?.totalRuns).toBe(5);
  });

  it('starts a sweep when the quest is cleared in the same action batch', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => {
      result.current.markQuestCleared('quest-main-1');
      result.current.startSweep('quest-main-1', 3);
    });

    expect(result.current.save.progress.clearedQuestIds).toContain('quest-main-1');
    expect(result.current.save.activeRun?.questId).toBe('quest-main-1');
    expect(result.current.save.activeRun?.totalRuns).toBe(3);
  });

  it('loads a valid save from localStorage', () => {
    const existing = createInitialSave(123);
    existing.progress.clearedQuestIds = ['quest-main-1'];
    localStorage.setItem(storageKey, JSON.stringify(existing));
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 999}>{children}</GameProvider>;

    const { result } = renderHook(() => useGame(), { wrapper });

    expect(result.current.save.createdAt).toBe(123);
    expect(result.current.save.progress.clearedQuestIds).toEqual(['quest-main-1']);
  });

  it('falls back to a default save when localStorage contains invalid data', () => {
    localStorage.setItem(storageKey, '{"version":2}');
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 456}>{children}</GameProvider>;

    const { result } = renderHook(() => useGame(), { wrapper });

    expect(result.current.save.createdAt).toBe(456);
    expect(result.current.save.progress.clearedQuestIds).toEqual([]);
  });

  it('throws when starting a sweep before first clear', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    expect(() => act(() => result.current.startSweep('quest-main-1', 1))).toThrow('副本未首通');
  });

  it('throws instead of replacing an active sweep', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.markQuestCleared('quest-main-1'));
    act(() => result.current.startSweep('quest-main-1', 2));
    const activeRunId = result.current.save.activeRun?.id;

    expect(() => act(() => result.current.startSweep('quest-main-1', 5))).toThrow('已有周回进行中');
    expect(result.current.save.activeRun?.id).toBe(activeRunId);
    expect(result.current.save.activeRun?.totalRuns).toBe(2);
  });

  it('exports the current save without mutating state', () => {
    const times = [1000, 2000];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameProvider now={() => times.shift() ?? 3000}>{children}</GameProvider>
    );
    const { result } = renderHook(() => useGame(), { wrapper });
    const before = result.current.save.updatedAt;

    const exported = result.current.exportCurrentSave();

    expect(JSON.parse(exported).version).toBe(2);
    expect(result.current.save.updatedAt).toBe(before);
  });

  it('supports early settlement using only completed runs and discards the current unfinished run', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000} random={() => 1}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.markQuestCleared('quest-main-1'));
    act(() => result.current.startSweep('quest-main-1', 2));

    let rewards: ReturnType<typeof result.current.settleActiveSweep> = [];
    act(() => {
      rewards = result.current.settleActiveSweep(1000 + 60_000);
    });
    expect(rewards).toEqual([]);
    expect(result.current.save.activeRun).toBeNull();
    expect(result.current.save.inventory.materials['ember-chip']).toBe(0);

    act(() => {
      rewards = result.current.settleActiveSweep(1000 + 10 * 60_000);
    });
    expect(rewards).toEqual([]);
    expect(result.current.save.inventory.materials['ember-chip']).toBe(0);
    expect(result.current.save.characterStates['char-leya-ember-rail'].exp).toBe(0);
    expect(result.current.save.activeRun).toBeNull();

    act(() => {
      rewards = result.current.settleActiveSweep(1000 + 20 * 60_000);
    });
    expect(rewards).toEqual([]);
    expect(result.current.save.inventory.materials['ember-chip']).toBe(0);
  });

  it('settles a completed sweep once when called twice in the same action batch', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000} random={() => 1}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.markQuestCleared('quest-main-1'));
    act(() => result.current.startSweep('quest-main-1', 2));

    let first: ReturnType<typeof result.current.settleActiveSweep> = [];
    let second: ReturnType<typeof result.current.settleActiveSweep> = [];
    act(() => {
      first = result.current.settleActiveSweep(1000 + 10 * 60_000);
      second = result.current.settleActiveSweep(1000 + 10 * 60_000);
    });

    expect(first).toEqual([{ itemId: 'ember-chip', kind: 'material', quantity: 2 }]);
    expect(second).toEqual([]);
    expect(result.current.save.inventory.materials['ember-chip']).toBe(2);
    expect(result.current.save.activeRun).toBeNull();
  });

  it('grants only completed runs when settling before sweep completion', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000} random={() => 1}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.markQuestCleared('quest-main-1'));
    act(() => result.current.startSweep('quest-main-1', 3));

    let rewards: ReturnType<typeof result.current.settleActiveSweep> = [];
    act(() => {
      rewards = result.current.settleActiveSweep(1000 + 11 * 60_000);
    });

    expect(rewards).toEqual([{ itemId: 'ember-chip', kind: 'material', quantity: 2 }]);
    expect(result.current.save.inventory.materials['ember-chip']).toBe(2);
    expect(result.current.save.characterStates['char-leya-ember-rail'].exp).toBe(50);
    expect(result.current.save.activeRun).toBeNull();
  });

  it('clears an active sweep with an unknown quest id without granting rewards', () => {
    const badSave = createInitialSave(1000);
    badSave.activeRun = {
      id: 'run-missing-quest',
      questId: 'quest-missing',
      startedAt: 1000,
      endsAt: 1000 + 60_000,
      totalRuns: 1,
      runDurationMs: 60_000,
    };
    localStorage.setItem(storageKey, JSON.stringify(badSave));
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 2000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    let rewards: ReturnType<typeof result.current.settleActiveSweep> = [];
    act(() => {
      rewards = result.current.settleActiveSweep(2000);
    });

    expect(rewards).toEqual([]);
    expect(result.current.save.activeRun).toBeNull();
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').activeRun).toBeNull();
  });

  it('rejects invalid resource quantities', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    for (const quantity of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => act(() => result.current.addCurrency('crystal', quantity))).toThrow('资源数量无效');
      expect(() => act(() => result.current.addMaterial('ember-chip', quantity))).toThrow('资源数量无效');
    }

    act(() => result.current.addCurrency('crystal', 2));
    act(() => result.current.addMaterial('ember-chip', 3));

    expect(result.current.save.inventory.currencies.crystal).toBe(2);
    expect(result.current.save.inventory.materials['ember-chip']).toBe(3);
  });

  it('grants mixed rewards into inventory', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() =>
      result.current.grantRewards([
        { itemId: 'crystal', kind: 'currency', quantity: 300 },
        { itemId: 'ember-chip', kind: 'material', quantity: 2 },
        { itemId: 'summon-helios-engine', kind: 'summon', quantity: 1 },
      ]),
    );

    expect(result.current.save.inventory.currencies.crystal).toBe(300);
    expect(result.current.save.inventory.materials['ember-chip']).toBe(2);
    expect(result.current.save.inventory.summonIds).toContain('summon-helios-engine');
  });

  it('grants stage 2 material reward kinds into materials', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() =>
      result.current.grantRewards([
        { itemId: 'fire-character-uncap', kind: 'characterUncapMaterial', quantity: 1 },
        { itemId: 'fire-weapon-skill', kind: 'weaponSkillMaterial', quantity: 2 },
      ]),
    );

    expect(result.current.save.inventory.materials['fire-character-uncap']).toBe(1);
    expect(result.current.save.inventory.materials['fire-weapon-skill']).toBe(2);
  });

  it('upgrades persisted character and weapon states', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.addMaterial('fire-character-exp', 1));
    act(() => result.current.addMaterial('fire-weapon-skill', 1));
    act(() => result.current.upgradeCharacter('char-leya-ember-rail'));
    act(() => result.current.upgradeWeaponSkill('weapon-red-rail-saber'));

    expect(result.current.save.characterStates['char-leya-ember-rail'].level).toBe(2);
    expect(result.current.save.weaponStates['weapon-red-rail-saber'].skillLevel).toBe(2);
    expect(result.current.save.inventory.materials['fire-character-exp']).toBe(0);
    expect(result.current.save.inventory.materials['fire-weapon-skill']).toBe(0);
  });

  it('swaps character formation slots', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.setCharacterSlot(0, 'char-noin-ash-protocol'));

    expect(result.current.save.formation.characterIds[0]).toBe('char-noin-ash-protocol');
    expect(result.current.save.formation.characterIds[3]).toBe('char-leya-ember-rail');
  });

  it('switches active element teams without overwriting another element team', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.setCharacterSlot(0, 'char-noin-ash-protocol'));
    act(() => result.current.setFormationElement('water'));

    expect(result.current.save.formation.activeElement).toBe('water');
    expect(result.current.save.formation.characterIds[0]).toBe('char-leya-ember-rail');

    act(() => result.current.setCharacterSlot(0, 'char-caro-furnace'));
    act(() => result.current.setFormationElement('fire'));

    expect(result.current.save.formation.characterIds[0]).toBe('char-noin-ash-protocol');
    expect(result.current.save.formation.teams.water.characterIds[0]).toBe('char-caro-furnace');
  });

  it('updates weapon and summon formation slots', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.setWeaponSlot(0, 'weapon-furnace-grid-blade'));
    act(() => result.current.setWeaponSlot(1, 'weapon-red-rail-saber'));
    act(() => result.current.setSummonSlot(0, 'summon-aurora-core'));
    act(() => result.current.setSummonSlot(1, 'summon-helios-engine'));

    expect(result.current.save.formation.weaponIds[0]).toBe('weapon-furnace-grid-blade');
    expect(result.current.save.formation.weaponIds[1]).toBe('weapon-red-rail-saber');
    expect(result.current.save.formation.summonIds[0]).toBe('summon-aurora-core');
    expect(result.current.save.formation.summonIds[1]).toBe('summon-helios-engine');
  });

  it('swaps positions when the chosen equipment is already on the grid', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.setWeaponSlot(0, 'weapon-furnace-grid-blade'));
    expect(result.current.save.formation.weaponIds[0]).toBe('weapon-furnace-grid-blade');
    expect(result.current.save.formation.weaponIds[1]).toBe('weapon-red-rail-saber');

    act(() => result.current.setSummonSlot(0, 'summon-aurora-core'));
    expect(result.current.save.formation.summonIds[0]).toBe('summon-aurora-core');
    expect(result.current.save.formation.summonIds[1]).toBe('summon-helios-engine');
  });

  it('moves equipped items into empty target slots instead of duplicating them', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.setWeaponSlot(2, 'weapon-furnace-grid-blade'));
    expect(result.current.save.formation.weaponIds[0]).toBe('weapon-red-rail-saber');
    expect(result.current.save.formation.weaponIds[1]).toBeNull();
    expect(result.current.save.formation.weaponIds[2]).toBe('weapon-furnace-grid-blade');

    act(() => result.current.setSummonSlot(2, 'summon-aurora-core'));
    expect(result.current.save.formation.summonIds[0]).toBe('summon-helios-engine');
    expect(result.current.save.formation.summonIds[1]).toBeNull();
    expect(result.current.save.formation.summonIds[2]).toBe('summon-aurora-core');
  });

  it('rejects invalid reward quantities', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    for (const quantity of [0, -1, 1.5, NaN, Infinity]) {
      expect(() =>
        act(() => result.current.grantRewards([{ itemId: 'crystal', kind: 'currency', quantity }])),
      ).toThrow('奖励数量无效');
    }

    expect(result.current.save.inventory.currencies.crystal).toBe(0);
  });

  it('pulls gacha by spending resources and adding owned results', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000} random={() => 0}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.addCurrency('crystal', 300));
    let results: ReturnType<typeof result.current.pullFromGacha> = [];
    act(() => {
      results = result.current.pullFromGacha(1);
    });

    expect(results).toHaveLength(1);
    expect(result.current.save.inventory.currencies.crystal).toBe(0);
    expect(result.current.save.inventory.characterIds).toContain(results[0].id);
  });

  it('imports save JSON into state and localStorage', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });
    const imported = createInitialSave(777);
    imported.inventory.currencies.crystal = 900;

    act(() => result.current.importSaveJson(exportSave(imported)));

    expect(result.current.save.inventory.currencies.crystal).toBe(900);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').inventory.currencies.crystal).toBe(900);
  });
});
