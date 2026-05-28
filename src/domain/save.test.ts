import { describe, expect, it } from 'vitest';
import { createInitialSave, exportSave, importSave } from './save';

describe('save', () => {
  it('exports and imports versioned save data', () => {
    const save = createInitialSave(1234);
    const json = exportSave(save);
    const imported = importSave(json);

    expect(imported.version).toBe(1);
    expect(imported.createdAt).toBe(1234);
  });

  it('rejects invalid save json', () => {
    expect(() => importSave('{ "version": "bad" }')).toThrow('存档格式无效');
  });

  it('rejects malformed save json', () => {
    expect(() => importSave('{')).toThrow('存档格式无效');
  });
});
