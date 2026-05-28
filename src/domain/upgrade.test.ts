import { describe, expect, it } from 'vitest';
import { initialCharacters, initialWeapons } from './content';
import { upgradeCharacterLevel, upgradeWeaponSkill } from './upgrade';

describe('upgrade', () => {
  it('levels a character when enough ember chips are available', () => {
    const result = upgradeCharacterLevel({ character: initialCharacters[0], materials: { 'ember-chip': 5 } });
    expect(result.character.level).toBe(2);
    expect(result.materials['ember-chip']).toBe(4);
  });

  it('levels a weapon skill with furnace cores', () => {
    const result = upgradeWeaponSkill({ weapon: initialWeapons[0], materials: { 'furnace-core': 3 } });
    expect(result.weapon.skills[0].level).toBe(2);
    expect(result.materials['furnace-core']).toBe(2);
  });
});
