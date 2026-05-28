import { describe, expect, it } from 'vitest';
import { initialQuests } from './content';
import { createSweepRun, getSweepProgress, settleSweepRun } from './expedition';

describe('expedition', () => {
  it('caps sweep count at 100 and calculates duration', () => {
    const run = createSweepRun({ quest: initialQuests[0], requestedRuns: 120, startedAt: 1000, sweepEfficiency: 0 });

    expect(run.totalRuns).toBe(100);
    expect(run.endsAt).toBe(1000 + initialQuests[0].runDurationMs * 100);
  });

  it('reports progress and settles completed runs', () => {
    const run = createSweepRun({ quest: initialQuests[0], requestedRuns: 10, startedAt: 0, sweepEfficiency: 0 });

    expect(getSweepProgress({ run, now: initialQuests[0].runDurationMs * 5 }).completedRuns).toBe(5);

    const settlement = settleSweepRun({ run, quest: initialQuests[0], now: run.endsAt, dropRateBonus: 0, random: () => 0 });
    expect(settlement.completedRuns).toBe(10);
    expect(settlement.rewards.length).toBeGreaterThan(0);
    expect(settlement.isComplete).toBe(true);
  });

  it('does not grant rewards until the sweep run is complete', () => {
    const run = createSweepRun({ quest: initialQuests[0], requestedRuns: 10, startedAt: 0, sweepEfficiency: 0 });

    const settlement = settleSweepRun({
      run,
      quest: initialQuests[0],
      now: initialQuests[0].runDurationMs * 5,
      dropRateBonus: 0,
      random: () => 0,
    });

    expect(settlement.completedRuns).toBe(5);
    expect(settlement.isComplete).toBe(false);
    expect(settlement.rewards).toEqual([]);
  });

  it('marks completed sweep runs as settled when granting rewards', () => {
    const run = createSweepRun({ quest: initialQuests[0], requestedRuns: 2, startedAt: 0, sweepEfficiency: 0 });

    const settlement = settleSweepRun({ run, quest: initialQuests[0], now: run.endsAt, dropRateBonus: 0, random: () => 0 });

    expect(settlement.rewards.length).toBeGreaterThan(0);
    expect(settlement.run).toEqual({ ...run, settledAt: run.endsAt });
    expect(run.settledAt).toBeUndefined();
  });

  it('does not grant rewards again for already settled sweep runs', () => {
    const run = createSweepRun({ quest: initialQuests[0], requestedRuns: 2, startedAt: 0, sweepEfficiency: 0 });
    const firstSettlement = settleSweepRun({ run, quest: initialQuests[0], now: run.endsAt, dropRateBonus: 0, random: () => 0 });

    const secondSettlement = settleSweepRun({
      run: firstSettlement.run,
      quest: initialQuests[0],
      now: run.endsAt + 1000,
      dropRateBonus: 0,
      random: () => 0,
    });

    expect(secondSettlement.completedRuns).toBe(2);
    expect(secondSettlement.isComplete).toBe(true);
    expect(secondSettlement.rewards).toEqual([]);
    expect(secondSettlement.run).toEqual(firstSettlement.run);
  });

  it('clamps invalid requested runs to one finite run', () => {
    const run = createSweepRun({
      quest: initialQuests[0],
      requestedRuns: Number.POSITIVE_INFINITY,
      startedAt: 1000,
      sweepEfficiency: 0,
    });

    expect(run.totalRuns).toBe(1);
    expect(Number.isFinite(run.endsAt)).toBe(true);
  });

  it('reports zero progress before the run starts', () => {
    const run = createSweepRun({ quest: initialQuests[0], requestedRuns: 3, startedAt: 10_000, sweepEfficiency: 0 });

    expect(getSweepProgress({ run, now: 5_000 })).toEqual({
      completedRuns: 0,
      remainingRuns: 3,
      isComplete: false,
    });
  });
});
