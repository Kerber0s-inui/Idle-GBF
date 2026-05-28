import { useGame } from '../../state/gameStore';

export function UpgradeScreen() {
  const { save } = useGame();
  const emberChips = save.inventory.materials['ember-chip'] ?? 0;
  const furnaceCores = save.inventory.materials['furnace-core'] ?? 0;

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
        <div className="stat-row">
          <span>可强化对象</span>
          <strong>{save.inventory.weaponIds.length + save.inventory.summonIds.length} 个</strong>
        </div>
      </div>
    </>
  );
}
