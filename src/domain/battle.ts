import type { Character, Enemy, Modifier, PartyLoadout, Summon, Weapon } from './types';
import { calculateAttackBreakdown, calculateChargeGain, rollMultiattack } from './formula';

export interface BattleEvent {
  kind: 'normalAttack' | 'chargeAttack' | 'enemyAttack' | 'passive';
  actor: string;
  target?: string;
  label: string;
  damage?: number;
  hitCount?: number;
  chargeGain?: number;
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
  random: () => number;
}

function collectModifiers(characters: Character[], weapons: Weapon[]): Modifier[] {
  return [
    ...characters.flatMap((character) => character.passives.flatMap((passive) => passive.modifiers)),
    ...weapons.flatMap((weapon) => weapon.skills.flatMap((skill) => skill.modifiers))
  ];
}

function getSummonBoosts(loadout: PartyLoadout, summons: Summon[]) {
  const activeSummons = summons.filter((summon) => summon.id === loadout.mainSummonId || summon.id === loadout.supportSummonId);
  return {
    magnaBoost: activeSummons.filter((summon) => summon.aura.target === 'magna').reduce((total, summon) => total + summon.aura.boost, 0),
    normalBoost: activeSummons.filter((summon) => summon.aura.target === 'normal').reduce((total, summon) => total + summon.aura.boost, 0),
    elementalAttack: activeSummons.filter((summon) => summon.aura.target === 'elemental').reduce((total, summon) => total + summon.aura.boost, 0)
  };
}

export function simulateBattle(input: SimulateBattleInput): BattleResult {
  const party = input.loadout.characterIds
    .map((id) => input.characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character));
  const gridWeapons = input.loadout.weaponGrid.weaponIds
    .map((id) => input.weapons.find((weapon) => weapon.id === id))
    .filter((weapon): weapon is Weapon => Boolean(weapon));
  const modifiers = collectModifiers(party, gridWeapons);
  const summonBoosts = getSummonBoosts(input.loadout, input.summons);
  const partyHp = Object.fromEntries(party.map((character) => [character.id, character.stats.hp])) as Record<string, number>;
  const charge = Object.fromEntries(party.map((character) => [character.id, 70])) as Record<string, number>;
  let enemyHp = input.enemy.stats.hp;
  const turns: BattleTurn[] = [];

  for (let turn = 1; turn <= 200; turn += 1) {
    const events: BattleEvent[] = [];

    for (const character of party) {
      if (partyHp[character.id] <= 0 || enemyHp <= 0) continue;
      const baseAttack = character.stats.atk + gridWeapons.reduce((total, weapon) => total + weapon.stats.atk, 0) / Math.max(1, party.length);
      const hpRatio = partyHp[character.id] / character.stats.hp;
      const chargeGainModifier = modifiers.filter((modifier) => modifier.type === 'chargeGain').reduce((total, modifier) => total + modifier.value, 0);
      const doubleAttackRate = modifiers.filter((modifier) => modifier.type === 'doubleAttackRate').reduce((total, modifier) => total + modifier.value, 0);
      const tripleAttackRate = modifiers.filter((modifier) => modifier.type === 'tripleAttackRate').reduce((total, modifier) => total + modifier.value, 0);

      if (charge[character.id] >= character.chargeAttack.chargeCost) {
        const breakdown = calculateAttackBreakdown({
          baseAttack,
          modifiers: [
            ...modifiers,
            {
              id: 'element-advantage',
              label: '属性克制',
              type: 'attack',
              value: 0.5 + summonBoosts.elementalAttack,
              category: 'elemental',
              source: 'summon'
            }
          ],
          magnaBoost: summonBoosts.magnaBoost,
          normalBoost: summonBoosts.normalBoost,
          hpRatio,
          attackKind: 'chargeAttack'
        });
        const damage = Math.max(1, Math.floor(Math.min(breakdown.finalAttack * character.chargeAttack.multiplier, character.chargeAttack.cap)));
        enemyHp -= damage;
        charge[character.id] = 0;
        events.push({ kind: 'chargeAttack', actor: character.name, target: input.enemy.name, label: character.chargeAttack.name, damage });
      } else {
        const multiattack = rollMultiattack({ doubleAttackRate, tripleAttackRate, random: input.random });
        const breakdown = calculateAttackBreakdown({
          baseAttack,
          modifiers: [
            ...modifiers,
            {
              id: 'element-advantage',
              label: '属性克制',
              type: 'attack',
              value: 0.5 + summonBoosts.elementalAttack,
              category: 'elemental',
              source: 'summon'
            }
          ],
          magnaBoost: summonBoosts.magnaBoost,
          normalBoost: summonBoosts.normalBoost,
          hpRatio,
          attackKind: 'normalAttack'
        });
        const damage = Math.max(1, Math.floor((breakdown.finalAttack / 8) * multiattack.hitCount));
        const chargeGain = calculateChargeGain({ baseGain: 10, hitCount: multiattack.hitCount, chargeGainModifier });
        enemyHp -= damage;
        charge[character.id] += chargeGain;
        events.push({
          kind: 'normalAttack',
          actor: character.name,
          target: input.enemy.name,
          label: multiattack.kind.toUpperCase(),
          damage,
          hitCount: multiattack.hitCount,
          chargeGain
        });
      }
    }

    if (enemyHp <= 0) {
      turns.push({ turn, events });
      return { outcome: 'win', summary: '胜利', turns, finalEnemyHp: 0, finalPartyHp: partyHp };
    }

    const aliveParty = party.filter((character) => partyHp[character.id] > 0);
    for (const character of aliveParty) {
      const defenseModifier = modifiers.filter((modifier) => modifier.type === 'defense').reduce((total, modifier) => total + modifier.value, 0);
      const damage = Math.max(1, Math.floor(input.enemy.normalAttackDamage / (1 + defenseModifier)));
      partyHp[character.id] -= damage;
      events.push({ kind: 'enemyAttack', actor: input.enemy.name, target: character.name, label: '普通攻击', damage });
    }

    turns.push({ turn, events });
    if (party.every((character) => partyHp[character.id] <= 0)) {
      return { outcome: 'loss', summary: '队伍被击败', turns, finalEnemyHp: Math.max(0, enemyHp), finalPartyHp: partyHp };
    }
  }

  return { outcome: 'loss', summary: '队伍被击败', turns, finalEnemyHp: Math.max(0, enemyHp), finalPartyHp: partyHp };
}
