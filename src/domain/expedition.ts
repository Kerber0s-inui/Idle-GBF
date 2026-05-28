import { rollRewards, type RewardStack } from './rewards';
import type { Quest } from './types';

export interface ExpeditionRun {
  id: string;
  questId: string;
  startedAt: number;
  endsAt: number;
  totalRuns: number;
  runDurationMs: number;
}

export interface SweepProgress {
  completedRuns: number;
  remainingRuns: number;
  isComplete: boolean;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clampRuns(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(100, Math.max(1, Math.floor(value)));
}

function normalizeDurationMs(questDurationMs: number, sweepEfficiency: number): number {
  const baseDurationMs = finiteOrZero(questDurationMs);
  const efficiency = Number.isFinite(sweepEfficiency) ? sweepEfficiency : 0;
  return Math.max(60_000, Math.floor(baseDurationMs * (1 + efficiency)));
}

export function createSweepRun(input: {
  quest: Quest;
  requestedRuns: number;
  startedAt: number;
  sweepEfficiency: number;
}): ExpeditionRun {
  const totalRuns = clampRuns(input.requestedRuns);
  const startedAt = finiteOrZero(input.startedAt);
  const runDurationMs = normalizeDurationMs(input.quest.runDurationMs, input.sweepEfficiency);

  return {
    id: `run-${input.quest.id}-${startedAt}`,
    questId: input.quest.id,
    startedAt,
    endsAt: startedAt + runDurationMs * totalRuns,
    totalRuns,
    runDurationMs,
  };
}

export function getSweepProgress(input: { run: ExpeditionRun; now: number }): SweepProgress {
  const totalRuns = clampRuns(input.run.totalRuns);
  const startedAt = finiteOrZero(input.run.startedAt);
  const now = finiteOrZero(input.now);
  const runDurationMs = Math.max(60_000, finiteOrZero(input.run.runDurationMs));
  const elapsed = Math.max(0, now - startedAt);
  const completedRuns = Math.min(totalRuns, Math.floor(elapsed / runDurationMs));

  return {
    completedRuns,
    remainingRuns: totalRuns - completedRuns,
    isComplete: completedRuns >= totalRuns,
  };
}

export function settleSweepRun(input: {
  run: ExpeditionRun;
  quest: Quest;
  now: number;
  dropRateBonus: number;
  random: () => number;
}): { completedRuns: number; rewards: RewardStack[] } {
  const { completedRuns } = getSweepProgress({ run: input.run, now: input.now });
  const rewards = rollRewards({
    quest: input.quest,
    runCount: completedRuns,
    includeFirstClear: false,
    dropRateBonus: input.dropRateBonus,
    random: input.random,
  });

  return { completedRuns, rewards };
}
