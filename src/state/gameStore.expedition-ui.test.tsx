import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
