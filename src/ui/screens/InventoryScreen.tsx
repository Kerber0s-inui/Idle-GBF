import { useGame } from '../../state/gameStore';

export function InventoryScreen() {
  const { save } = useGame();
  const materialKinds = Object.keys(save.inventory.materials).length;
  const currencyKinds = Object.keys(save.inventory.currencies).length;

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">本地存档</p>
        <h1 id="screen-title">仓库</h1>
      </header>

      <div className="panel">
        <div className="stat-row">
          <span>素材种类</span>
          <strong>{materialKinds}</strong>
        </div>
        <div className="stat-row">
          <span>货币种类</span>
          <strong>{currencyKinds}</strong>
        </div>
        <div className="stat-row">
          <span>装备收藏</span>
          <strong>{save.inventory.weaponIds.length + save.inventory.summonIds.length} 件</strong>
        </div>
      </div>
    </>
  );
}
