import { initialCharacters, initialSummons, initialWeapons } from '../../domain/content';
import { calculateAttackBreakdown } from '../../domain/formula';
import { createSummonGrid, createWeaponGrid, type FormationSlot } from '../../domain/formation';
import type { Modifier } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';
import { StatBreakdown } from '../components/StatBreakdown';

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function findSlotName(slot: FormationSlot, kind: 'weapon' | 'summon') {
  if (!slot.itemId) return '空';
  const source = kind === 'weapon' ? initialWeapons : initialSummons;
  return source.find((item) => item.id === slot.itemId)?.name ?? slot.itemId;
}

export function FormationScreen() {
  const { save } = useGame();
  const characters = save.inventory.characterIds
    .slice(0, 4)
    .map((id) => initialCharacters.find((character) => character.id === id))
    .filter(Boolean);
  const weapons = save.inventory.weaponIds
    .map((id) => initialWeapons.find((weapon) => weapon.id === id))
    .filter(Boolean);
  const summons = save.inventory.summonIds
    .map((id) => initialSummons.find((summon) => summon.id === id))
    .filter(Boolean);
  const weaponGrid = createWeaponGrid(save.inventory.weaponIds);
  const summonGrid = createSummonGrid(save.inventory.summonIds);
  const modifiers = weapons.flatMap((weapon) => weapon?.skills.flatMap((skill) => skill.modifiers) ?? []) as Modifier[];
  const magnaBoost = summons.filter((summon) => summon?.aura.target === 'magna').reduce((total, summon) => total + (summon?.aura.boost ?? 0), 0);
  const normalBoost = summons.filter((summon) => summon?.aura.target === 'normal').reduce((total, summon) => total + (summon?.aura.boost ?? 0), 0);
  const elementalAttack = summons
    .filter((summon) => summon?.aura.target === 'elemental')
    .reduce((total, summon) => total + (summon?.aura.boost ?? 0), 0);
  const breakdown = calculateAttackBreakdown({
    baseAttack: characters.reduce((total, character) => total + (character?.stats.atk ?? 0), 0),
    modifiers: [
      ...modifiers,
      { id: 'ui-elemental', label: '属性攻击', type: 'attack', value: elementalAttack, category: 'elemental', source: 'summon' },
    ],
    magnaBoost,
    normalBoost,
    hpRatio: 1,
    attackKind: 'normalAttack',
  });
  const chargeGain = characters.flatMap((character) => character?.passives.flatMap((passive) => passive.modifiers) ?? []).filter((modifier) => modifier.type === 'chargeGain' || modifier.type === 'doubleAttackRate').length;

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">火队</p>
        <h1 id="screen-title">编成</h1>
      </header>

      <section className="panel content-panel">
        <h2>前排成员</h2>
        <div className="row-list">
          {characters.map((character) => (
            <div className="list-item" key={character?.id}>
              <IconBadge label={character?.name ?? ''} />
              <div>
                <strong>{character?.name}</strong>
                <span>
                  {character?.rarity} Lv.{save.characterStates[character?.id ?? '']?.level ?? character?.level}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel content-panel">
        <h2>武器与召唤</h2>
        <div>
          <div className="grid-title">
            <span>武器盘</span>
            <strong>1 + 9</strong>
          </div>
          <div className="equipment-grid weapon-grid">
            {weaponGrid.slots.map((slot) => {
              const name = findSlotName(slot, 'weapon');
              const state = slot.itemId ? save.weaponStates[slot.itemId] : null;

              return (
                <div className={slot.kind === 'empty' ? 'equipment-slot empty-slot' : 'equipment-slot'} data-testid="weapon-grid-slot" key={slot.index}>
                  {slot.kind === 'empty' ? <span aria-hidden="true" className="icon-badge">+</span> : <IconBadge label={name} />}
                  <span>{slot.role === 'main' ? '主手' : `副${slot.index}`}</span>
                  <strong>{slot.kind === 'empty' ? '空' : name}</strong>
                  {state ? <small>Lv.{state.level}/SLv.{state.skillLevel}</small> : null}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="grid-title">
            <span>召唤石</span>
            <strong>1 + 4</strong>
          </div>
          <div className="equipment-grid summon-grid">
            {summonGrid.slots.map((slot) => {
              const name = findSlotName(slot, 'summon');
              const state = slot.itemId ? save.summonStates[slot.itemId] : null;

              return (
                <div className={slot.kind === 'empty' ? 'equipment-slot empty-slot' : 'equipment-slot'} data-testid="summon-grid-slot" key={slot.index}>
                  {slot.kind === 'empty' ? <span aria-hidden="true" className="icon-badge">+</span> : <IconBadge label={name} />}
                  <span>{slot.role === 'main' ? '主召' : `副${slot.index}`}</span>
                  <strong>{slot.kind === 'empty' ? '空' : name}</strong>
                  {state ? <small>Lv.{state.level}</small> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel content-panel">
        <h2>伤害拆解</h2>
        <StatBreakdown
          rows={[
            { label: '通常攻刃', value: percent(breakdown.sections.normal) },
            { label: '方阵攻刃', value: percent(breakdown.sections.magna) },
            { label: 'EX 攻刃', value: percent(breakdown.sections.ex) },
            { label: '属性攻击', value: percent(breakdown.sections.elemental) },
            { label: '连击/奥义槽', value: chargeGain > 0 ? `${chargeGain} 条来源` : '无额外来源' },
          ]}
        />
      </section>
    </>
  );
}
