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
