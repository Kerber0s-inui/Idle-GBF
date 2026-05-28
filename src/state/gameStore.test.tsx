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

  it('exports the current save without mutating state', () => {
    const times = [1000, 2000];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameProvider now={() => times.shift() ?? 3000}>{children}</GameProvider>
    );
    const { result } = renderHook(() => useGame(), { wrapper });
    const before = result.current.save.updatedAt;

    const exported = result.current.exportCurrentSave();

    expect(JSON.parse(exported).version).toBe(1);
    expect(result.current.save.updatedAt).toBe(before);
  });

  it('does not reward unfinished sweeps and rewards completed sweeps once', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000} random={() => 1}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.markQuestCleared('quest-main-1'));
    act(() => result.current.startSweep('quest-main-1', 2));

    let rewards: ReturnType<typeof result.current.settleActiveSweep> = [];
    act(() => {
      rewards = result.current.settleActiveSweep(1000 + 60_000);
    });
    expect(rewards).toEqual([]);
    expect(result.current.save.activeRun).not.toBeNull();
    expect(result.current.save.inventory.materials['ember-chip']).toBe(0);

    act(() => {
      rewards = result.current.settleActiveSweep(1000 + 10 * 60_000);
    });
    expect(rewards).toEqual([{ itemId: 'ember-chip', kind: 'material', quantity: 2 }]);
    expect(result.current.save.inventory.materials['ember-chip']).toBe(2);
    expect(result.current.save.activeRun).toBeNull();

    act(() => {
      rewards = result.current.settleActiveSweep(1000 + 20 * 60_000);
    });
    expect(rewards).toEqual([]);
    expect(result.current.save.inventory.materials['ember-chip']).toBe(2);
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
