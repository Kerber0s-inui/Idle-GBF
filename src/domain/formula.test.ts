import { describe, expect, it } from 'vitest';
import { calculateAttackBreakdown, calculateChargeGain, clampModifierCaps, rollMultiattack } from './formula';

describe('formula', () => {
  it('multiplies normal, magna, ex, elemental, and independent attack sections', () => {
    const result = calculateAttackBreakdown({
      baseAttack: 1000,
      modifiers: [
        { id: 'n', label: 'normal', type: 'attack', value: 0.2, category: 'normal', source: 'weapon' },
        { id: 'm', label: 'magna', type: 'attack', value: 0.3, category: 'magna', source: 'weapon' },
        { id: 'e', label: 'ex', type: 'attack', value: 0.1, category: 'ex', source: 'weapon' },
        { id: 'el', label: 'elemental', type: 'attack', value: 0.5, category: 'elemental', source: 'summon' },
        { id: 'i', label: 'independent', type: 'attack', value: 0.1, category: 'independent', source: 'character' }
      ],
      magnaBoost: 0.5,
      normalBoost: 0,
      hpRatio: 1,
      attackKind: 'normalAttack'
    });

    expect(result.finalAttack).toBeCloseTo(1000 * 1.2 * 1.45 * 1.1 * 1.5 * 1.1, 4);
    expect(result.sections.magna).toBeCloseTo(0.45, 4);
    expect(result.attackKind).toBe('normalAttack');
  });

  it('clamps hp ratio before applying stamina and enmity', () => {
    const highHp = calculateAttackBreakdown({
      baseAttack: 1000,
      modifiers: [
        { id: 'stamina', label: 'stamina', type: 'stamina', value: 0.2, source: 'weapon' },
        { id: 'enmity', label: 'enmity', type: 'enmity', value: 0.3, source: 'weapon' }
      ],
      magnaBoost: 0,
      normalBoost: 0,
      hpRatio: 2,
      attackKind: 'normalAttack'
    });
    const lowHp = calculateAttackBreakdown({
      baseAttack: 1000,
      modifiers: [
        { id: 'stamina', label: 'stamina', type: 'stamina', value: 0.2, source: 'weapon' },
        { id: 'enmity', label: 'enmity', type: 'enmity', value: 0.3, source: 'weapon' }
      ],
      magnaBoost: 0,
      normalBoost: 0,
      hpRatio: -1,
      attackKind: 'normalAttack'
    });

    expect(highHp.sections.stamina).toBeCloseTo(0.2, 4);
    expect(highHp.sections.enmity).toBeCloseTo(0, 4);
    expect(lowHp.sections.stamina).toBeCloseTo(0, 4);
    expect(lowHp.sections.enmity).toBeCloseTo(0.3, 4);
  });

  it('caps critical rate, damage cap, drop rate, and sweep efficiency', () => {
    const capped = clampModifierCaps({
      criticalRate: 1.7,
      damageCap: 0.8,
      normalAttackCap: 0.9,
      chargeCap: 0.9,
      dropRate: 0.9,
      sweepEfficiency: -0.8,
      damageReduction: 0.9
    });

    expect(capped.criticalRate).toBe(1);
    expect(capped.damageCap).toBe(0.2);
    expect(capped.normalAttackCap).toBe(0.5);
    expect(capped.chargeCap).toBe(0.5);
    expect(capped.dropRate).toBe(0.5);
    expect(capped.sweepEfficiency).toBe(-0.3);
    expect(capped.damageReduction).toBe(0.7);
  });

  it('does not return NaN from capped modifier boundaries', () => {
    const capped = clampModifierCaps({
      criticalRate: Number.NaN,
      damageCap: Number.POSITIVE_INFINITY,
      normalAttackCap: Number.NEGATIVE_INFINITY,
      chargeCap: Number.NaN,
      dropRate: Number.POSITIVE_INFINITY,
      sweepEfficiency: Number.NaN,
      damageReduction: Number.POSITIVE_INFINITY
    });

    expect(Object.values(capped).every(Number.isFinite)).toBe(true);
    expect(capped.criticalRate).toBe(0);
    expect(capped.damageCap).toBe(0);
    expect(capped.normalAttackCap).toBe(0);
    expect(capped.chargeCap).toBe(0);
    expect(capped.dropRate).toBe(0);
    expect(capped.sweepEfficiency).toBe(0);
    expect(capped.damageReduction).toBe(0);
  });

  it('links multiattack to charge gain', () => {
    expect(calculateChargeGain({ baseGain: 10, hitCount: 1, chargeGainModifier: 0 })).toBe(10);
    expect(calculateChargeGain({ baseGain: 10, hitCount: 2, chargeGainModifier: 0 })).toBe(20);
    expect(calculateChargeGain({ baseGain: 10, hitCount: 3, chargeGainModifier: 0.25 })).toBe(37.5);
  });

  it('does not return negative charge gain for invalid inputs', () => {
    expect(calculateChargeGain({ baseGain: -10, hitCount: 3, chargeGainModifier: 0 })).toBe(0);
    expect(calculateChargeGain({ baseGain: 10, hitCount: -3, chargeGainModifier: 0 })).toBe(0);
    expect(calculateChargeGain({ baseGain: 10, hitCount: 3, chargeGainModifier: -2 })).toBe(0);
    expect(calculateChargeGain({ baseGain: Number.NaN, hitCount: Number.POSITIVE_INFINITY, chargeGainModifier: Number.NaN })).toBe(0);
  });

  it('prioritizes triple attack over double attack', () => {
    expect(rollMultiattack({ doubleAttackRate: 1, tripleAttackRate: 1, random: () => 0.2 })).toEqual({
      kind: 'ta',
      hitCount: 3
    });
    expect(rollMultiattack({ doubleAttackRate: 1, tripleAttackRate: 0, random: () => 0.2 })).toEqual({
      kind: 'da',
      hitCount: 2
    });
  });

  it('falls back to single attack when multiattack rolls miss or are non-finite', () => {
    expect(rollMultiattack({ doubleAttackRate: 0.4, tripleAttackRate: 0.3, random: () => 0.9 })).toEqual({
      kind: 'sa',
      hitCount: 1
    });
    expect(rollMultiattack({ doubleAttackRate: 1, tripleAttackRate: 1, random: () => Number.NaN })).toEqual({
      kind: 'sa',
      hitCount: 1
    });
  });

  it('uses a second roll for double attack after triple attack misses', () => {
    const rolls = [0.8, 0.2];

    expect(
      rollMultiattack({
        doubleAttackRate: 0.5,
        tripleAttackRate: 0.5,
        random: () => rolls.shift() ?? 1
      })
    ).toEqual({ kind: 'da', hitCount: 2 });
  });

  it('clamps multiattack rates before rolling', () => {
    expect(rollMultiattack({ doubleAttackRate: 0, tripleAttackRate: Number.POSITIVE_INFINITY, random: () => 0.5 })).toEqual({
      kind: 'sa',
      hitCount: 1
    });
    expect(rollMultiattack({ doubleAttackRate: -1, tripleAttackRate: -1, random: () => 0 })).toEqual({
      kind: 'sa',
      hitCount: 1
    });
    expect(rollMultiattack({ doubleAttackRate: 2, tripleAttackRate: 0, random: () => 0.5 })).toEqual({
      kind: 'da',
      hitCount: 2
    });
  });
});
