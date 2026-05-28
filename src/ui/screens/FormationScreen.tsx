import { useGame } from '../../state/gameStore';

export function FormationScreen() {
  const { save } = useGame();

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">火队</p>
        <h1 id="screen-title">编成</h1>
      </header>

      <div className="panel">
        <div className="stat-row">
          <span>前排成员</span>
          <strong>{save.inventory.characterIds.length} 人</strong>
        </div>
        <div className="stat-row">
          <span>武器盘</span>
          <strong>{save.inventory.weaponIds.length} 件</strong>
        </div>
        <div className="stat-row">
          <span>主召唤</span>
          <strong>{save.inventory.summonIds.length > 0 ? '已配置' : '未配置'}</strong>
        </div>
      </div>
    </>
  );
}
