import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialQuests } from './content';
import { createSweepRun } from './expedition';
import { createInitialSave, exportSave, importSave } from './save';

describe('save', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports and imports versioned save data', () => {
    const save = createInitialSave(1234);
    const json = exportSave(save);
    const imported = importSave(json);

    expect(imported.version).toBe(1);
    expect(imported.createdAt).toBe(1234);
  });

  it('exports with a refreshed updatedAt without mutating the original save', () => {
    const save = createInitialSave(1234);
    vi.spyOn(Date, 'now').mockReturnValue(5678);

    const json = exportSave(save);
    const exported = importSave(json);

    expect(save.updatedAt).toBe(1234);
    expect(exported.updatedAt).toBe(5678);
  });

  it('round-trips active sweep runs', () => {
    const save = createInitialSave(1234);
    save.activeRun = createSweepRun({ quest: initialQuests[0], requestedRuns: 3, startedAt: 2000, sweepEfficiency: 0 });

    const imported = importSave(exportSave(save));

    expect(imported.activeRun).toEqual(save.activeRun);
  });

  it('round-trips settled active sweep runs', () => {
    const save = createInitialSave(1234);
    save.activeRun = {
      ...createSweepRun({ quest: initialQuests[0], requestedRuns: 3, startedAt: 2000, sweepEfficiency: 0 }),
      settledAt: 3000,
    };

    const imported = importSave(exportSave(save));

    expect(imported.activeRun).toEqual(save.activeRun);
  });

  it('rejects invalid save json', () => {
    expect(() => importSave('{ "version": "bad" }')).toThrow('存档格式无效');
  });

  it('rejects malformed save json', () => {
    expect(() => importSave('{')).toThrow('存档格式无效');
  });

  it('rejects invalid active runs', () => {
    const save = createInitialSave(1234);
    const json = JSON.stringify({ ...save, activeRun: { id: 'bad-run' } });

    expect(() => importSave(json)).toThrow('存档格式无效');
  });
});
