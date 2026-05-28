import { useState } from 'react';
import { initialCharacters, initialSummons, initialWeapons } from '../../domain/content';
import type { GachaPoolItem } from '../../domain/gacha';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';

function findName(item: GachaPoolItem) {
  if (item.kind === 'character') return initialCharacters.find((character) => character.id === item.id)?.name ?? item.id;
  if (item.kind === 'weapon') return initialWeapons.find((weapon) => weapon.id === item.id)?.name ?? item.id;
  return initialSummons.find((summon) => summon.id === item.id)?.name ?? item.id;
}

export function GachaScreen() {
  const { save, pullFromGacha } = useGame();
  const [results, setResults] = useState<GachaPoolItem[]>([]);
  const [message, setMessage] = useState('');
  const crystals = save.inventory.currencies.crystal ?? 0;
  const tickets = save.inventory.currencies['gacha-ticket'] ?? 0;

  const handlePull = (count: 1 | 10) => {
    setMessage('');
    try {
      setResults(pullFromGacha(count));
    } catch (error) {
      setResults([]);
      const message = error instanceof Error ? error.message : '抽卡失败';
      setMessage(message.includes('资源不足') ? '抽卡资源不足' : message);
    }
  };

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">星炉常驻池</p>
        <h1 id="screen-title">抽卡</h1>
      </header>

      <div className="panel">
        <div className="stat-row">
          <span>宝晶石</span>
          <strong>{crystals}</strong>
        </div>
        <div className="stat-row">
          <span>抽卡券</span>
          <strong>{tickets}</strong>
        </div>
      </div>

      <section className="panel content-panel">
        <div className="actions">
          <button className="primary-button" type="button" onClick={() => handlePull(1)}>
            单抽
          </button>
          <button className="secondary-button" type="button" onClick={() => handlePull(10)}>
            十连
          </button>
        </div>
        {message ? <p className="status-text">{message}</p> : null}
        <div className="row-list">
          {results.map((item, index) => (
            <div className="list-item" key={`${item.id}-${index}`}>
              <IconBadge label={findName(item)} />
              <div>
                <strong>{findName(item)}</strong>
                <span>
                  {item.rarity} / {item.kind}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
