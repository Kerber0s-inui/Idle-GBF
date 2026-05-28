import { useState } from 'react';
import { useGame } from '../../state/gameStore';

export function InventoryScreen() {
  const { save, exportCurrentSave, importSaveJson } = useGame();
  const [saveJson, setSaveJson] = useState('');
  const [message, setMessage] = useState('');
  const materials = Object.entries(save.inventory.materials);
  const currencies = Object.entries(save.inventory.currencies);

  const handleExport = () => {
    setSaveJson(exportCurrentSave());
    setMessage('存档已导出');
  };

  const handleImport = () => {
    try {
      importSaveJson(saveJson);
      setMessage('存档已导入');
    } catch {
      setMessage('导入失败');
    }
  };

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">本地存档</p>
        <h1 id="screen-title">仓库</h1>
      </header>

      <section className="panel content-panel">
        <h2>资源</h2>
        <div className="row-list">
          {currencies.map(([itemId, quantity]) => (
            <div className="list-item compact-item" key={itemId}>
              <strong>{itemId}</strong>
              <span>{quantity}</span>
            </div>
          ))}
          {materials.map(([itemId, quantity]) => (
            <div className="list-item compact-item" key={itemId}>
              <strong>{itemId}</strong>
              <span>{quantity}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel content-panel">
        <h2>收藏</h2>
        <div className="stat-row">
          <span>角色</span>
          <strong>{save.inventory.characterIds.length}</strong>
        </div>
        <div className="stat-row">
          <span>武器</span>
          <strong>{save.inventory.weaponIds.length}</strong>
        </div>
        <div className="stat-row">
          <span>召唤</span>
          <strong>{save.inventory.summonIds.length}</strong>
        </div>
        <p className="status-text">发布模式：原创/占位素材</p>
      </section>

      <section className="panel content-panel">
        <h2>存档工具</h2>
        <div className="actions">
          <button className="primary-button" type="button" onClick={handleExport}>
            导出存档
          </button>
          <button className="secondary-button" type="button" onClick={handleImport}>
            导入存档
          </button>
        </div>
        <textarea
          aria-label="存档 JSON"
          className="save-textarea"
          value={saveJson}
          onChange={(event) => setSaveJson(event.target.value)}
        />
        {message ? <p className="status-text">{message}</p> : null}
      </section>
    </>
  );
}
