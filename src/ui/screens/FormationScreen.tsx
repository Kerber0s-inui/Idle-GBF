import { initialCharacters, initialSummons, initialWeapons } from '../../domain/content';
import { calculateAttackBreakdown } from '../../domain/formula';
import type { Modifier } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';
import { StatBreakdown } from '../components/StatBreakdown';

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
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
                  {character?.rarity} Lv.{character?.level}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel content-panel">
        <h2>武器与召唤</h2>
        <div className="stat-row">
          <span>武器盘</span>
          <strong>{weapons.length} 件</strong>
        </div>
        <div className="stat-row">
          <span>召唤石</span>
          <strong>{summons.map((summon) => summon?.name).join(' / ')}</strong>
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
