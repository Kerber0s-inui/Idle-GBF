import type { Character, Enemy, Modifier, PartyLoadout, Summon, Weapon } from './types';
import { calculateAttackBreakdown, calculateChargeGain, rollMultiattack } from './formula';

const SAFETY_TURN_LIMIT = 200;

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

function sumModifiers(modifiers: Modifier[], type: Modifier['type']) {
  return modifiers.filter((modifier) => modifier.type === type).reduce((total, modifier) => total + modifier.value, 0);
}

function getWeaponModifiers(weapons: Weapon[]): Modifier[] {
  return weapons.flatMap((weapon) => weapon.skills.flatMap((skill) => skill.modifiers));
}

function isPartyWideModifier(character: Character, passive: Character['passives'][number], modifier: Modifier) {
  const explicitPartyWide = [passive.name, passive.description, modifier.label].some((text) => text.includes('全队'));
  const contentPartyWide = [
    'mod-caro-defense',
    'mod-caro-hp',
    'mod-mira-crit-rate',
    'mod-mira-ca-cap',
    'mod-noin-da'
  ].includes(modifier.id);

  return explicitPartyWide || contentPartyWide;
}

function getPartyWideCharacterModifiers(party: Character[]): Modifier[] {
  return party.flatMap((character) =>
    character.passives.flatMap((passive) => passive.modifiers.filter((modifier) => isPartyWideModifier(character, passive, modifier)))
  );
}

function getCharacterModifiers(character: Character, party: Character[], weapons: Weapon[]): Modifier[] {
  const weaponModifiers = getWeaponModifiers(weapons);
  const partyWideCharacterModifiers = getPartyWideCharacterModifiers(party);
  const selfModifiers = character.passives.flatMap((passive) =>
    passive.modifiers.filter((modifier) => !isPartyWideModifier(character, passive, modifier))
  );

  return [...weaponModifiers, ...partyWideCharacterModifiers, ...selfModifiers];
}

function getSummonBoosts(loadout: PartyLoadout, summons: Summon[]) {
  const activeSummons = summons.filter((summon) => summon.id === loadout.mainSummonId || summon.id === loadout.supportSummonId);
  return {
    magnaBoost: activeSummons.filter((summon) => summon.aura.target === 'magna').reduce((total, summon) => total + summon.aura.boost, 0),
    normalBoost: activeSummons.filter((summon) => summon.aura.target === 'normal').reduce((total, summon) => total + summon.aura.boost, 0),
    elementalAttack: activeSummons.filter((summon) => summon.aura.target === 'elemental').reduce((total, summon) => total + summon.aura.boost, 0),
    sharedHp: activeSummons.reduce((total, summon) => total + summon.stats.hp, 0)
  };
}

function createElementAdvantageModifier(elementalAttack: number): Modifier {
  return {
    id: 'element-advantage',
    label: '属性克制',
    type: 'attack',
    value: 0.5 + elementalAttack,
    category: 'elemental',
    source: 'summon'
  };
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
  const sharedSummonHp = summonBoosts.sharedHp / Math.max(1, party.length);
  const maxPartyHp = Object.fromEntries(
    party.map((character) => {
      const modifiers = getCharacterModifiers(character, party, gridWeapons);
      const hpModifier = sumModifiers(modifiers, 'hp');
      const hp = Math.max(1, Math.floor((character.stats.hp + sharedWeaponHp + sharedSummonHp) * (1 + hpModifier)));
      return [character.id, hp];
    })
  ) as Record<string, number>;
  const partyHp = { ...maxPartyHp };
  const charge = Object.fromEntries(party.map((character) => [character.id, 70])) as Record<string, number>;
  let enemyHp = input.enemy.stats.hp;
  const turns: BattleTurn[] = [];

  for (let turn = 1; turn <= SAFETY_TURN_LIMIT; turn += 1) {
    const events: BattleEvent[] = [];

    for (const character of party) {
      if (partyHp[character.id] <= 0 || enemyHp <= 0) continue;
      const modifiers = getCharacterModifiers(character, party, gridWeapons);
      const attackModifiers = [...modifiers, createElementAdvantageModifier(summonBoosts.elementalAttack)];
      const baseAttack = character.stats.atk + sharedWeaponAttack;
      const hpRatio = partyHp[character.id] / maxPartyHp[character.id];
      const chargeGainModifier = sumModifiers(modifiers, 'chargeGain');
      const doubleAttackRate = sumModifiers(modifiers, 'doubleAttackRate');
      const tripleAttackRate = sumModifiers(modifiers, 'tripleAttackRate');

      if (charge[character.id] >= character.chargeAttack.chargeCost) {
        const breakdown = calculateAttackBreakdown({
          baseAttack,
          modifiers: attackModifiers,
          magnaBoost: summonBoosts.magnaBoost,
          normalBoost: summonBoosts.normalBoost,
          hpRatio,
          attackKind: 'chargeAttack'
        });
        const chargeDamageModifier = sumModifiers(modifiers, 'chargeDamage');
        const chargeCapModifier = sumModifiers(modifiers, 'chargeCap');
        const damageCapModifier = sumModifiers(modifiers, 'damageCap');
        const cap = character.chargeAttack.cap * (1 + chargeCapModifier + damageCapModifier);
        const uncappedDamage = breakdown.finalAttack * character.chargeAttack.multiplier * (1 + chargeDamageModifier);
        const damage = Math.max(1, Math.floor(Math.min(uncappedDamage, cap)));
        enemyHp -= damage;
        charge[character.id] = 0;
        events.push({ kind: 'chargeAttack', actor: character.name, target: input.enemy.name, label: character.chargeAttack.name, damage });
      } else {
        const multiattack = rollMultiattack({ doubleAttackRate, tripleAttackRate, random: input.random });
        const breakdown = calculateAttackBreakdown({
          baseAttack,
          modifiers: attackModifiers,
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
      const modifiers = getCharacterModifiers(character, party, gridWeapons);
      const defenseModifier = sumModifiers(modifiers, 'defense');
      const damage = Math.max(1, Math.floor(input.enemy.normalAttackDamage / (1 + defenseModifier)));
      partyHp[character.id] = Math.max(0, partyHp[character.id] - damage);
      events.push({ kind: 'enemyAttack', actor: input.enemy.name, target: character.name, label: '普通攻击', damage });
    }

    turns.push({ turn, events });
    if (party.every((character) => partyHp[character.id] <= 0)) {
      return { outcome: 'loss', summary: '队伍被击败', turns, finalEnemyHp: Math.max(0, enemyHp), finalPartyHp: partyHp };
    }
  }

  throw new Error('Battle simulation exceeded safety turn limit');
}
