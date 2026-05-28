import { describe, expect, it } from 'vitest';
import { initialQuests } from './content';
import { createSummonGrid, createWeaponGrid } from './formation';
import {
  applyCharacterExp,
  previewCharacterUpgrade,
  uncapCharacter,
  uncapSummon,
  uncapWeapon,
  upgradeCharacter,
  upgradeSummon,
  upgradeWeapon,
  upgradeWeaponSkill,
} from './growth';
import { createInitialSave, importSave } from './save';

describe('stage 2 quest content', () => {
  it('separates main, boss and material quests with unlock links', () => {
    expect(initialQuests.some((quest) => quest.kind === 'main')).toBe(true);
    const bossQuest = initialQuests.find((quest) => quest.kind === 'boss');
    const materialQuest = initialQuests.find((quest) => quest.kind === 'material');

    expect(bossQuest?.unlockAfterQuestId).toBe('quest-main-1');
    expect(materialQuest?.unlockAfterQuestId).toBe('quest-main-1');
    expect(bossQuest?.dropTable.some((drop) => drop.kind === 'characterUncapMaterial')).toBe(true);
    expect(materialQuest?.dropTable.some((drop) => drop.kind === 'weaponSkillMaterial')).toBe(true);
  });
});

describe('stage 2 formation', () => {
  it('builds 1+9 weapon and 1+4 summon grids with empty slots', () => {
    const weaponGrid = createWeaponGrid(['weapon-red-rail-saber', 'weapon-furnace-grid-blade']);
    const summonGrid = createSummonGrid(['summon-helios-engine']);

    expect(weaponGrid.mainWeaponId).toBe('weapon-red-rail-saber');
    expect(weaponGrid.slots).toHaveLength(10);
    expect(weaponGrid.slots.filter((slot) => slot.kind === 'empty')).toHaveLength(8);
    expect(summonGrid.mainSummonId).toBe('summon-helios-engine');
    expect(summonGrid.slots).toHaveLength(5);
    expect(summonGrid.slots.filter((slot) => slot.kind === 'empty')).toHaveLength(4);
  });
});

describe('stage 2 growth', () => {
  it('stores migrated character, weapon and summon states', () => {
    const save = createInitialSave(1000);

    expect(save.version).toBe(2);
    expect(save.characterStates['char-leya-ember-rail']).toMatchObject({ level: 1, exp: 0, uncap: 0, levelCap: 40 });
    expect(save.weaponStates['weapon-red-rail-saber']).toMatchObject({ level: 1, exp: 0, uncap: 0, levelCap: 40, skillLevel: 1 });
    expect(save.summonStates['summon-helios-engine']).toMatchObject({ level: 1, exp: 0, uncap: 0, levelCap: 40 });
  });

  it('migrates version 1 saves without losing inventory', () => {
    const oldSave = {
      version: 1,
      createdAt: 1,
      updatedAt: 1,
      progress: { clearedQuestIds: ['quest-main-1'], unlockedCharacterIds: ['char-leya-ember-rail'] },
      inventory: {
        characterIds: ['char-leya-ember-rail'],
        weaponIds: ['weapon-red-rail-saber'],
        summonIds: ['summon-helios-engine'],
        materials: { crystalShard: 3 },
        currencies: { crystal: 300 },
      },
      activeRun: null,
    };

    const migrated = importSave(JSON.stringify(oldSave));

    expect(migrated.version).toBe(2);
    expect(migrated.inventory.currencies.crystal).toBe(300);
    expect(migrated.progress.clearedQuestIds).toContain('quest-main-1');
    expect(migrated.characterStates['char-leya-ember-rail'].level).toBe(1);
  });

  it('applies party character exp up to level cap and keeps overflow exp', () => {
    const save = createInitialSave(1000);
    const next = applyCharacterExp(save, ['char-leya-ember-rail', 'char-caro-furnace'], 5000);

    expect(next.characterStates['char-leya-ember-rail'].exp).toBe(2500);
    expect(next.characterStates['char-leya-ember-rail'].level).toBeGreaterThan(1);
    expect(next.characterStates['char-leya-ember-rail'].level).toBeLessThanOrEqual(next.characterStates['char-leya-ember-rail'].levelCap);
  });

  it('upgrades and uncaps characters with persisted material costs', () => {
    const save = createInitialSave(1000);
    const withMaterials = {
      ...save,
      inventory: {
        ...save.inventory,
        materials: { ...save.inventory.materials, 'fire-character-exp': 2, 'fire-character-uncap': 1 },
      },
    };

    const upgraded = upgradeCharacter(withMaterials, 'char-leya-ember-rail', 2);
    const uncapped = uncapCharacter(upgraded, 'char-leya-ember-rail', 1);

    expect(upgraded.inventory.materials['fire-character-exp']).toBe(1);
    expect(upgraded.characterStates['char-leya-ember-rail'].exp).toBeGreaterThan(0);
    expect(uncapped.inventory.materials['fire-character-uncap']).toBe(0);
    expect(uncapped.characterStates['char-leya-ember-rail'].levelCap).toBe(60);
  });

  it('upgrades and uncaps weapons and summons with persisted material costs', () => {
    const save = createInitialSave(1000);
    const withMaterials = {
      ...save,
      inventory: {
        ...save.inventory,
        materials: {
          ...save.inventory.materials,
          'fire-weapon-exp': 1,
          'fire-weapon-skill': 1,
          'fire-weapon-uncap': 1,
          'fire-summon-exp': 1,
          'fire-summon-uncap': 1,
        },
      },
    };

    const upgradedWeapon = upgradeWeapon(withMaterials, 'weapon-red-rail-saber', 2);
    const upgradedSkill = upgradeWeaponSkill(upgradedWeapon, 'weapon-red-rail-saber', 2);
    const uncappedWeapon = uncapWeapon(upgradedSkill, 'weapon-red-rail-saber', 1);
    const upgradedSummon = upgradeSummon(uncappedWeapon, 'summon-helios-engine', 2);
    const uncappedSummon = uncapSummon(upgradedSummon, 'summon-helios-engine', 1);

    expect(upgradedWeapon.weaponStates['weapon-red-rail-saber'].level).toBe(2);
    expect(upgradedSkill.weaponStates['weapon-red-rail-saber'].skillLevel).toBe(2);
    expect(uncappedWeapon.weaponStates['weapon-red-rail-saber'].levelCap).toBe(60);
    expect(upgradedSummon.summonStates['summon-helios-engine'].level).toBe(2);
    expect(uncappedSummon.summonStates['summon-helios-engine'].levelCap).toBe(60);
  });

  it('blocks upgrades at current cap and uncaps at max stage', () => {
    const save = createInitialSave(1000);

    expect(() =>
      upgradeWeapon(
        {
          ...save,
          inventory: {
            ...save.inventory,
            materials: { ...save.inventory.materials, 'fire-weapon-exp': 1 },
          },
          weaponStates: {
            ...save.weaponStates,
            'weapon-red-rail-saber': { ...save.weaponStates['weapon-red-rail-saber'], level: 40 },
          },
        },
        'weapon-red-rail-saber',
        41,
      ),
    ).toThrow();

    expect(() =>
      uncapSummon(
        {
          ...save,
          inventory: {
            ...save.inventory,
            materials: { ...save.inventory.materials, 'fire-summon-uncap': 1 },
          },
          summonStates: {
            ...save.summonStates,
            'summon-helios-engine': { ...save.summonStates['summon-helios-engine'], uncap: 3, levelCap: 100 },
          },
        },
        'summon-helios-engine',
        4,
      ),
    ).toThrow();
  });

  it('supports target preview upgrades with bounded material spend', () => {
    const save = createInitialSave(1000);
    const withMaterials = {
      ...save,
      inventory: {
        ...save.inventory,
        materials: { ...save.inventory.materials, 'fire-character-exp': 5 },
      },
    };

    const preview = previewCharacterUpgrade(withMaterials, 'char-leya-ember-rail', 4);

    expect(preview.spent).toBe(3);
    expect(preview.save.characterStates['char-leya-ember-rail'].level).toBe(4);
    expect(preview.save.inventory.materials['fire-character-exp']).toBe(2);
  });
});
