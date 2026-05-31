import type { Character, Enemy, EnemySpecialTarget, Modifier, PartyLoadout, Summon, Weapon } from './types';
import { calculateAttackBreakdown, calculateChargeGain, clampModifierCaps, rollMultiattack, sumModifiers } from './formula';
import { getActiveBondModifiers } from './partyBonuses';
import { getUnlockedCharacterPassives, type CharacterGrowthState } from './progression';

const SAFETY_TURN_LIMIT = 200;

export interface BattleEvent {
  kind: 'normalAttack' | 'chargeAttack' | 'enemyAttack' | 'specialAttack' | 'fallen' | 'passive';
  phase?: 'player' | 'enemy' | 'system';
  actor: string;
  target?: string;
  label: string;
  message?: string;
  damage?: number;
  hitCount?: number;
  chargeGain?: number;
  snapshot?: {
    actor?: BattleSnapshotUnit;
    target?: BattleSnapshotUnit;
    boss?: BattleSnapshotUnit;
    targets?: BattleSnapshotUnit[];
  };
}

export interface BattleSnapshotUnit {
  id?: string;
  name: string;
  hp: number;
  maxHp?: number;
  atk: number;
  defense: number;
  charge?: number;
}

export interface BattleTurn {
  turn: number;
  events: BattleEvent[];
}

export interface BattleResult {
  outcome: 'win' | 'loss';
  summary: '胜利' | '队伍被击败';
  turns: BattleTurn[];
  finalEnemyHp: number;
  finalPartyHp: Record<string, number>;
}

export interface SimulateBattleInput {
  characters: Character[];
  weapons: Weapon[];
  summons: Summon[];
  enemy: Enemy;
  loadout: PartyLoadout;
  characterStates?: Record<string, CharacterGrowthState>;
  random: () => number;
}

function getWeaponModifiers(weapons: Weapon[]): Modifier[] {
  return weapons.flatMap((weapon) => weapon.skills.flatMap((skill) => skill.modifiers));
}

function isPartyWideModifier(_character: Character, passive: Character['passives'][number], modifier: Modifier) {
  const explicitPartyWide = [passive.name, passive.description, modifier.label].some((text) => text.includes('全队'));
  const contentPartyWide = ['mod-caro-defense', 'mod-caro-hp', 'mod-mira-crit-rate', 'mod-mira-ca-cap', 'mod-noin-da'].includes(modifier.id);
  return explicitPartyWide || contentPartyWide;
}

function getActivePassives(character: Character, characterStates?: Record<string, CharacterGrowthState>) {
  return characterStates ? getUnlockedCharacterPassives(character, characterStates[character.id]) : character.passives;
}

function getPartyWideCharacterModifiers(party: Character[], characterStates?: Record<string, CharacterGrowthState>) {
  return party.flatMap((character) =>
    getActivePassives(character, characterStates).flatMap((passive) =>
      passive.modifiers.filter((modifier) => isPartyWideModifier(character, passive, modifier)),
    ),
  );
}

function getCharacterModifiers(
  character: Character,
  party: Character[],
  weapons: Weapon[],
  characterStates?: Record<string, CharacterGrowthState>,
) {
  const weaponModifiers = getWeaponModifiers(weapons);
  const activePassives = getActivePassives(character, characterStates);
  const partyWideCharacterModifiers = getPartyWideCharacterModifiers(party, characterStates);
  const bondModifiers = getActiveBondModifiers(party);
  const selfModifiers = activePassives.flatMap((passive) =>
    passive.modifiers.filter((modifier) => !isPartyWideModifier(character, passive, modifier)),
  );
  return [...weaponModifiers, ...partyWideCharacterModifiers, ...bondModifiers, ...selfModifiers];
}

function getSummonBoosts(loadout: PartyLoadout, summons: Summon[]) {
  const auraSummons = summons.filter((summon) => summon.id === loadout.mainSummonId);
  const equippedSummons = (loadout.summonIds?.length ? loadout.summonIds : [loadout.mainSummonId, loadout.supportSummonId])
    .filter(Boolean)
    .map((id) => summons.find((summon) => summon.id === id))
    .filter((summon): summon is Summon => Boolean(summon));
  return {
    magnaBoost: auraSummons.filter((summon) => summon.aura.target === 'magna').reduce((total, summon) => total + summon.aura.boost, 0),
    normalBoost: auraSummons.filter((summon) => summon.aura.target === 'normal').reduce((total, summon) => total + summon.aura.boost, 0),
    totalAttack: equippedSummons.reduce((total, summon) => total + summon.stats.atk, 0),
    totalHp: equippedSummons.reduce((total, summon) => total + summon.stats.hp, 0),
    totalDefense: equippedSummons.reduce((total, summon) => total + summon.stats.defense, 0),
  };
}

function createElementAdvantageModifier(): Modifier {
  return {
    id: 'element-advantage',
    label: '属性克制',
    type: 'attack',
    value: 0.5,
    category: 'elemental',
    source: 'summon',
  };
}

function createCharacterSnapshot(input: {
  character: Character;
  hp: number;
  maxHp: number;
  charge: number;
  sharedWeaponAttack: number;
  sharedSummonAttack: number;
  sharedSummonDefense: number;
  modifiers: Modifier[];
}): BattleSnapshotUnit {
  const defenseModifier = sumModifiers(input.modifiers, 'defense');
  return {
    id: input.character.id,
    name: input.character.name,
    hp: Math.max(0, Math.floor(input.hp)),
    maxHp: Math.max(1, Math.floor(input.maxHp)),
    atk: Math.max(0, Math.floor(input.character.stats.atk + input.sharedWeaponAttack + input.sharedSummonAttack)),
    defense: Math.max(0, Math.floor((input.character.stats.defense + input.sharedSummonDefense) * (1 + defenseModifier))),
    charge: Math.max(0, Math.floor(input.charge)),
  };
}

function createBossSnapshot(enemy: Enemy, hp: number, maxHp: number, charge: number): BattleSnapshotUnit {
  return {
    id: enemy.id,
    name: enemy.name,
    hp: Math.max(0, Math.floor(hp)),
    maxHp: Math.max(1, Math.floor(maxHp)),
    atk: Math.max(0, Math.floor(enemy.stats.atk)),
    defense: Math.max(0, Math.floor(enemy.stats.defense)),
    charge: Math.max(0, Math.floor(charge)),
  };
}

function targetLabel(targets: Character[]) {
  if (targets.length === 0) return '无人';
  if (targets.length > 1) return '我方全体';
  return targets[0].name;
}

function chooseTargets(input: { target: EnemySpecialTarget; aliveParty: Character[]; random: () => number }) {
  if (input.target.kind === 'all') return input.aliveParty;
  if (input.aliveParty.length === 0) return [];
  if (input.target.kind === 'single') {
    const index = Math.min(input.aliveParty.length - 1, Math.floor(input.random() * input.aliveParty.length));
    return [input.aliveParty[index]];
  }

  const remaining = [...input.aliveParty];
  const chosen: Character[] = [];
  const count = Math.min(input.target.count, remaining.length);
  for (let index = 0; index < count; index += 1) {
    const targetIndex = Math.min(remaining.length - 1, Math.floor(input.random() * remaining.length));
    const [target] = remaining.splice(targetIndex, 1);
    chosen.push(target);
  }
  return chosen;
}

function selectSpecialAction(input: {
  enemy: Enemy;
  enemyHp: number;
  maxEnemyHp: number;
  bossCharge: number;
  triggeredThresholdIds: Set<string>;
}) {
  const actions = input.enemy.specialActions ?? [];
  const hpRatio = input.enemyHp / Math.max(1, input.maxEnemyHp);
  const hpSpecial = actions.find(
    (action) =>
      action.trigger.kind === 'hpThreshold' &&
      hpRatio <= action.trigger.threshold &&
      !input.triggeredThresholdIds.has(action.id),
  );
  if (hpSpecial) return hpSpecial;

  const chargeMax = input.enemy.chargeMax ?? Number.POSITIVE_INFINITY;
  return actions.find((action) => action.trigger.kind === 'chargeFull' && input.bossCharge >= chargeMax) ?? null;
}

function enemyDamageToTarget(input: {
  enemy: Enemy;
  target: Character;
  party: Character[];
  gridWeapons: Weapon[];
  multiplier: number;
  characterStates?: Record<string, CharacterGrowthState>;
}) {
  const modifiers = getCharacterModifiers(input.target, input.party, input.gridWeapons, input.characterStates);
  const defenseModifier = sumModifiers(modifiers, 'defense');
  return Math.max(1, Math.floor((input.enemy.normalAttackDamage * input.multiplier) / (1 + defenseModifier)));
}

export function simulateBattle(input: SimulateBattleInput): BattleResult {
  const party = input.loadout.characterIds
    .map((id) => input.characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character));
  const gridWeapons = input.loadout.weaponGrid.weaponIds
    .map((id) => input.weapons.find((weapon) => weapon.id === id))
    .filter((weapon): weapon is Weapon => Boolean(weapon));
  const summonBoosts = getSummonBoosts(input.loadout, input.summons);
  const sharedWeaponAttack = gridWeapons.reduce((total, weapon) => total + weapon.stats.atk, 0) / Math.max(1, party.length);
  const sharedWeaponHp = gridWeapons.reduce((total, weapon) => total + weapon.stats.hp, 0) / Math.max(1, party.length);
  const sharedSummonAttack = summonBoosts.totalAttack / Math.max(1, party.length);
  const sharedSummonHp = summonBoosts.totalHp / Math.max(1, party.length);
  const sharedSummonDefense = summonBoosts.totalDefense / Math.max(1, party.length);
  const maxPartyHp = Object.fromEntries(
    party.map((character) => {
      const modifiers = getCharacterModifiers(character, party, gridWeapons, input.characterStates);
      const hpModifier = sumModifiers(modifiers, 'hp');
      const hp = Math.max(1, Math.floor((character.stats.hp + sharedWeaponHp + sharedSummonHp) * (1 + hpModifier)));
      return [character.id, hp];
    }),
  ) as Record<string, number>;

  const partyHp = { ...maxPartyHp };
  const charge = Object.fromEntries(party.map((character) => [character.id, 70])) as Record<string, number>;
  const maxEnemyHp = input.enemy.stats.hp;
  let enemyHp = input.enemy.stats.hp;
  let bossCharge = 0;
  const triggeredThresholdIds = new Set<string>();
  const turns: BattleTurn[] = [];

  for (let turn = 1; turn <= SAFETY_TURN_LIMIT; turn += 1) {
    const events: BattleEvent[] = [];

    for (const character of party) {
      if (partyHp[character.id] <= 0 || enemyHp <= 0) continue;
      const modifiers = getCharacterModifiers(character, party, gridWeapons, input.characterStates);
      const cappedModifiers = clampModifierCaps({
        criticalRate: sumModifiers(modifiers, 'criticalRate'),
        damageCap: sumModifiers(modifiers, 'damageCap'),
        normalAttackCap: sumModifiers(modifiers, 'normalAttackCap'),
        chargeCap: sumModifiers(modifiers, 'chargeCap'),
        dropRate: sumModifiers(modifiers, 'dropRate'),
        sweepEfficiency: sumModifiers(modifiers, 'sweepEfficiency'),
        damageReduction: 0,
      });
      const attackModifiers = [...modifiers, createElementAdvantageModifier()];
      const baseAttack = character.stats.atk + sharedWeaponAttack + sharedSummonAttack;
      const hpRatio = partyHp[character.id] / maxPartyHp[character.id];
      const chargeGainModifier = sumModifiers(modifiers, 'chargeGain');
      const doubleAttackRate = sumModifiers(modifiers, 'doubleAttackRate');
      const tripleAttackRate = sumModifiers(modifiers, 'tripleAttackRate');
      const actorSnapshot = () =>
        createCharacterSnapshot({
          character,
          hp: partyHp[character.id],
          maxHp: maxPartyHp[character.id],
          charge: charge[character.id],
          sharedWeaponAttack,
          sharedSummonAttack,
          sharedSummonDefense,
          modifiers,
        });

      if (charge[character.id] >= character.chargeAttack.chargeCost) {
        const breakdown = calculateAttackBreakdown({
          baseAttack,
          modifiers: attackModifiers,
          magnaBoost: summonBoosts.magnaBoost,
          normalBoost: summonBoosts.normalBoost,
          hpRatio,
          attackKind: 'chargeAttack',
        });
        const chargeDamageModifier = sumModifiers(modifiers, 'chargeDamage');
        const cap = character.chargeAttack.cap * (1 + cappedModifiers.chargeCap);
        const uncappedDamage = breakdown.finalAttack * character.chargeAttack.multiplier * (1 + chargeDamageModifier);
        const damage = Math.max(1, Math.floor(Math.min(uncappedDamage, cap)));
        enemyHp = Math.max(0, enemyHp - damage);
        charge[character.id] = 0;
        events.push({
          kind: 'chargeAttack',
          phase: 'player',
          actor: character.name,
          target: input.enemy.name,
          label: character.chargeAttack.name,
          message: `${character.name}发动奥义对${input.enemy.name}造成了 ${damage} 伤害`,
          damage,
          snapshot: {
            actor: actorSnapshot(),
            boss: createBossSnapshot(input.enemy, enemyHp, maxEnemyHp, bossCharge),
          },
        });
      } else {
        const multiattack = rollMultiattack({ doubleAttackRate, tripleAttackRate, random: input.random });
        const breakdown = calculateAttackBreakdown({
          baseAttack,
          modifiers: attackModifiers,
          magnaBoost: summonBoosts.magnaBoost,
          normalBoost: summonBoosts.normalBoost,
          hpRatio,
          attackKind: 'normalAttack',
        });
        const perHitDamage = Math.min(440000 * (1 + cappedModifiers.normalAttackCap), breakdown.finalAttack / 8);
        const damage = Math.max(1, Math.floor(perHitDamage * multiattack.hitCount));
        const chargeGain = calculateChargeGain({ baseGain: 10, hitCount: multiattack.hitCount, chargeGainModifier });
        enemyHp = Math.max(0, enemyHp - damage);
        charge[character.id] += chargeGain;
        events.push({
          kind: 'normalAttack',
          phase: 'player',
          actor: character.name,
          target: input.enemy.name,
          label: multiattack.kind.toUpperCase(),
          message: `${character.name}对${input.enemy.name}造成了 ${damage} 伤害`,
          damage,
          hitCount: multiattack.hitCount,
          chargeGain,
          snapshot: {
            actor: actorSnapshot(),
            boss: createBossSnapshot(input.enemy, enemyHp, maxEnemyHp, bossCharge),
          },
        });
      }
    }

    if (enemyHp <= 0) {
      turns.push({ turn, events });
      return { outcome: 'win', summary: '胜利', turns, finalEnemyHp: 0, finalPartyHp: partyHp };
    }

    const alivePartyBeforeEnemyAction = party.filter((character) => partyHp[character.id] > 0);
    const hpBeforeEnemyAction = { ...partyHp };
    const specialAction = selectSpecialAction({
      enemy: input.enemy,
      enemyHp,
      maxEnemyHp,
      bossCharge,
      triggeredThresholdIds,
    });

    if (specialAction) {
      if (specialAction.trigger.kind === 'hpThreshold') triggeredThresholdIds.add(specialAction.id);
      const targets = chooseTargets({ target: specialAction.target, aliveParty: alivePartyBeforeEnemyAction, random: input.random });
      const targetSnapshots: BattleSnapshotUnit[] = [];
      let totalDamage = 0;

      for (const target of targets) {
        const damage = enemyDamageToTarget({
          enemy: input.enemy,
          target,
          party,
          gridWeapons,
          multiplier: specialAction.damageMultiplier,
          characterStates: input.characterStates,
        });
        partyHp[target.id] = Math.max(0, partyHp[target.id] - damage);
        totalDamage += damage;
        targetSnapshots.push(
          createCharacterSnapshot({
            character: target,
            hp: partyHp[target.id],
            maxHp: maxPartyHp[target.id],
            charge: charge[target.id],
            sharedWeaponAttack,
            sharedSummonAttack,
            sharedSummonDefense,
            modifiers: getCharacterModifiers(target, party, gridWeapons, input.characterStates),
          }),
        );
      }

      bossCharge = 0;
      events.push({
        kind: 'specialAttack',
        phase: 'enemy',
        actor: input.enemy.name,
        target: targetLabel(targets),
        label: specialAction.name,
        message: `${input.enemy.name}发动特动对${targetLabel(targets)}造成了 ${totalDamage} 伤害`,
        damage: totalDamage,
        snapshot: {
          boss: createBossSnapshot(input.enemy, enemyHp, maxEnemyHp, bossCharge),
          targets: targetSnapshots,
          target: targetSnapshots[0],
        },
      });
    } else {
      let totalDamage = 0;
      const targetSnapshots: BattleSnapshotUnit[] = [];
      for (const character of alivePartyBeforeEnemyAction) {
        const damage = enemyDamageToTarget({
          enemy: input.enemy,
          target: character,
          party,
          gridWeapons,
          multiplier: 1,
          characterStates: input.characterStates,
        });
        partyHp[character.id] = Math.max(0, partyHp[character.id] - damage);
        totalDamage += damage;
        targetSnapshots.push(
          createCharacterSnapshot({
            character,
            hp: partyHp[character.id],
            maxHp: maxPartyHp[character.id],
            charge: charge[character.id],
            sharedWeaponAttack,
            sharedSummonAttack,
            sharedSummonDefense,
            modifiers: getCharacterModifiers(character, party, gridWeapons, input.characterStates),
          }),
        );
      }
      bossCharge += 1;
      events.push({
        kind: 'enemyAttack',
        phase: 'enemy',
        actor: input.enemy.name,
        target: targetLabel(alivePartyBeforeEnemyAction),
        label: '普通攻击',
        message: `${input.enemy.name}对${targetLabel(alivePartyBeforeEnemyAction)}造成了 ${totalDamage} 伤害`,
        damage: totalDamage,
        snapshot: {
          boss: createBossSnapshot(input.enemy, enemyHp, maxEnemyHp, bossCharge),
          targets: targetSnapshots,
          target: targetSnapshots[0],
        },
      });
    }

    for (const character of party) {
      if (hpBeforeEnemyAction[character.id] > 0 && partyHp[character.id] <= 0) {
        events.push({
          kind: 'fallen',
          phase: 'system',
          actor: character.name,
          label: '倒下',
          message: `${character.name}倒下了`,
          snapshot: {
            actor: createCharacterSnapshot({
              character,
              hp: partyHp[character.id],
              maxHp: maxPartyHp[character.id],
              charge: charge[character.id],
              sharedWeaponAttack,
              sharedSummonAttack,
              sharedSummonDefense,
              modifiers: getCharacterModifiers(character, party, gridWeapons, input.characterStates),
            }),
            boss: createBossSnapshot(input.enemy, enemyHp, maxEnemyHp, bossCharge),
          },
        });
      }
    }

    turns.push({ turn, events });
    if (party.every((character) => partyHp[character.id] <= 0)) {
      return { outcome: 'loss', summary: '队伍被击败', turns, finalEnemyHp: Math.max(0, enemyHp), finalPartyHp: partyHp };
    }
  }

  throw new Error('Battle simulation exceeded safety turn limit');
}
