import { useState } from 'react';
import { initialCharacters, initialWeapons } from '../../domain/content';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';

export function UpgradeScreen() {
  const { save } = useGame();
  const [message, setMessage] = useState('');
  const emberChips = save.inventory.materials['ember-chip'] ?? 0;
  const furnaceCores = save.inventory.materials['furnace-core'] ?? 0;
  const characters = save.inventory.characterIds
    .map((id) => initialCharacters.find((character) => character.id === id))
    .filter(Boolean);
  const weapons = save.inventory.weaponIds.map((id) => initialWeapons.find((weapon) => weapon.id === id)).filter(Boolean);

  const handlePreview = (kind: 'character' | 'weapon') => {
    setMessage(
      kind === 'character'
        ? '需要余烬碎片 x1，等级成长将在后续版本持久化'
        : '需要炉心核心 x1，技能成长将在后续版本持久化',
    );
  };

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">成长</p>
        <h1 id="screen-title">强化</h1>
      </header>

      <div className="panel">
        <div className="stat-row">
          <span>余烬碎片</span>
          <strong>{emberChips}</strong>
        </div>
        <div className="stat-row">
          <span>炉心核心</span>
          <strong>{furnaceCores}</strong>
        </div>
      </div>

      <section className="panel content-panel">
        <h2>角色等级</h2>
        <div className="row-list">
          {characters.map((character) => (
            <div className="list-item split-item" key={character?.id}>
              <IconBadge label={character?.name ?? ''} />
              <div>
                <strong>{character?.name}</strong>
                <span>需要 ember-chip x1</span>
              </div>
              <button
                className="secondary-button"
                disabled={emberChips < 1}
                type="button"
                onClick={() => handlePreview('character')}
              >
                预览强化
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel content-panel">
        <h2>武器技能</h2>
        <div className="row-list">
          {weapons.map((weapon) => (
            <div className="list-item split-item" key={weapon?.id}>
              <IconBadge label={weapon?.name ?? ''} />
              <div>
                <strong>{weapon?.name}</strong>
                <span>需要 furnace-core x1</span>
              </div>
              <button
                className="secondary-button"
                disabled={furnaceCores < 1}
                type="button"
                onClick={() => handlePreview('weapon')}
              >
                查看消耗
              </button>
            </div>
          ))}
        </div>
      </section>
      {message ? <p className="status-text">{message}</p> : null}
    </>
  );
}
