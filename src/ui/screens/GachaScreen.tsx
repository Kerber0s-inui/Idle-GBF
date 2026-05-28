import { useGame } from '../../state/gameStore';

export function GachaScreen() {
  const { save } = useGame();

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">星炉常驻池</p>
        <h1 id="screen-title">抽卡</h1>
      </header>

      <div className="panel">
        <div className="stat-row">
          <span>宝晶石</span>
          <strong>{save.inventory.currencies.crystal ?? 0}</strong>
        </div>
        <div className="stat-row">
          <span>抽卡券</span>
          <strong>{save.inventory.currencies['gacha-ticket'] ?? 0}</strong>
        </div>
        <div className="stat-row">
          <span>卡池状态</span>
          <strong>常驻开放</strong>
        </div>
      </div>
    </>
  );
}
