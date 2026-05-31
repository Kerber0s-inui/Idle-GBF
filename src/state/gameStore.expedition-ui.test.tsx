import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createInitialSave } from '../domain/save';
import { storageKey } from './gameStore';
import { GameProvider, useGame } from './gameStore';

describe('game store expedition settlement', () => {
  it('settles completed runs early and discards the unfinished run', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000} random={() => 1}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.markQuestCleared('quest-main-1'));
    act(() => result.current.startSweep('quest-main-1', 3));

    let rewards: ReturnType<typeof result.current.settleActiveSweep> = [];
    act(() => {
      rewards = result.current.settleActiveSweep(1000 + 11 * 60_000);
    });

    expect(rewards).toEqual([{ itemId: 'ember-chip', kind: 'material', quantity: 2 }]);
    expect(result.current.save.characterStates['char-leya-ember-rail'].exp).toBe(50);
    expect(result.current.save.activeRun).toBeNull();
  });

  it('applies active party sweep bonuses from bond effects', () => {
    const save = createInitialSave(1000);
    save.progress.clearedQuestIds = ['quest-main-1'];
    save.formation.characterIds = [
      'char-noin-ash-protocol',
      'char-noin-ash-protocol',
      'char-leya-ember-rail',
      'char-caro-furnace',
    ];
    save.formation.teams.fire.characterIds = [...save.formation.characterIds];
    localStorage.setItem(storageKey, JSON.stringify(save));

    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000} random={() => 1}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.startSweep('quest-main-1', 1));

    expect(result.current.save.activeRun?.runDurationMs).toBe(270000);
  });
});
