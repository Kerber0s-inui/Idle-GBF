import type { AttackKind, Modifier } from './types';

export interface AttackBreakdownInput {
  baseAttack: number;
  modifiers: Modifier[];
  magnaBoost: number;
  normalBoost: number;
  hpRatio: number;
  attackKind: AttackKind;
}

export interface AttackBreakdown {
  finalAttack: number;
  sections: {
    normal: number;
    magna: number;
    ex: number;
    elemental: number;
    independent: number;
    stamina: number;
    enmity: number;
  };
}

export interface CappedModifiers {
  criticalRate: number;
  damageCap: number;
  normalAttackCap: number;
  chargeCap: number;
  dropRate: number;
  sweepEfficiency: number;
  damageReduction: number;
}

function sumModifiers(modifiers: Modifier[], type: Modifier['type'], category?: Modifier['category']) {
  return modifiers
    .filter((modifier) => modifier.type === type && (category === undefined || modifier.category === category))
    .reduce((total, modifier) => total + modifier.value, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampModifierCaps(input: CappedModifiers): CappedModifiers {
  return {
    criticalRate: clamp(input.criticalRate, 0, 1),
    damageCap: clamp(input.damageCap, 0, 0.2),
    normalAttackCap: clamp(input.normalAttackCap, 0, 0.5),
    chargeCap: clamp(input.chargeCap, 0, 0.5),
    dropRate: clamp(input.dropRate, 0, 0.5),
    sweepEfficiency: clamp(input.sweepEfficiency, -0.3, 0),
    damageReduction: clamp(input.damageReduction, 0, 0.7)
  };
}

export function calculateAttackBreakdown(input: AttackBreakdownInput): AttackBreakdown {
  const normal = sumModifiers(input.modifiers, 'attack', 'normal') * (1 + input.normalBoost);
  const magna = sumModifiers(input.modifiers, 'attack', 'magna') * (1 + input.magnaBoost);
  const ex = sumModifiers(input.modifiers, 'attack', 'ex');
  const elemental = sumModifiers(input.modifiers, 'attack', 'elemental');
  const independent = sumModifiers(input.modifiers, 'attack', 'independent');
  const stamina = sumModifiers(input.modifiers, 'stamina') * Math.max(0, input.hpRatio);
  const enmity = sumModifiers(input.modifiers, 'enmity') * Math.max(0, 1 - input.hpRatio);

  const finalAttack =
    input.baseAttack *
    (1 + normal) *
    (1 + magna) *
    (1 + ex) *
    (1 + elemental) *
    (1 + independent) *
    (1 + stamina + enmity);

  return { finalAttack, sections: { normal, magna, ex, elemental, independent, stamina, enmity } };
}

export function calculateChargeGain(input: { baseGain: number; hitCount: number; chargeGainModifier: number }) {
  return input.baseGain * input.hitCount * (1 + input.chargeGainModifier);
}

export function rollMultiattack(input: { doubleAttackRate: number; tripleAttackRate: number; random: () => number }) {
  const tripleAttackRate = clamp(input.tripleAttackRate, 0, 1);
  const doubleAttackRate = clamp(input.doubleAttackRate, 0, 1);
  const firstRoll = input.random();
  if (firstRoll < tripleAttackRate) return { kind: 'ta' as const, hitCount: 3 };
  const secondRoll = input.random();
  if (secondRoll < doubleAttackRate) return { kind: 'da' as const, hitCount: 2 };
  return { kind: 'sa' as const, hitCount: 1 };
}
