import { useMemo, useState } from 'react';
import { initialCharacters, initialSummons, initialWeapons } from '../../domain/content';
import { getCurrencyLabel, getMaterialLabel } from '../../domain/itemData';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';

type CollectionTab = 'character' | 'weapon' | 'summon';

type CollectionEntry = {
  id: string;
  name: string;
  owned: boolean;
};

type ResourceEntry = {
  id: string;
  label: string;
  quantity: number;
};

const RESOURCE_PAGE_SIZE = 9;
const COLLECTION_PAGE_SIZE = 16;

function buildCollectionCells(entries: CollectionEntry[]) {
  const cells = [...entries];
  const targetSize = Math.max(COLLECTION_PAGE_SIZE, Math.ceil(entries.length / COLLECTION_PAGE_SIZE) * COLLECTION_PAGE_SIZE);

  while (cells.length < targetSize) {
    cells.push({
      id: `placeholder-${cells.length}`,
      name: '???',
      owned: false,
    });
  }

  return cells;
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 0), Math.max(0, totalPages - 1));
}

export function InventoryScreen() {
  const { save, exportCurrentSave, importSaveJson } = useGame();
  const [saveJson, setSaveJson] = useState('');
  const [message, setMessage] = useState('');
  const [collectionTab, setCollectionTab] = useState<CollectionTab>('character');
  const [resourcePage, setResourcePage] = useState(0);
  const [collectionPageByTab, setCollectionPageByTab] = useState<Record<CollectionTab, number>>({
    character: 0,
    weapon: 0,
    summon: 0,
  });

  const resources = useMemo<ResourceEntry[]>(
    () => [
      ...Object.entries(save.inventory.currencies).map(([itemId, quantity]) => ({
        id: itemId,
        label: getCurrencyLabel(itemId),
        quantity,
      })),
      ...Object.entries(save.inventory.materials).map(([itemId, quantity]) => ({
        id: itemId,
        label: getMaterialLabel(itemId),
        quantity,
      })),
    ],
    [save.inventory.currencies, save.inventory.materials],
  );

  const collectionEntries = useMemo<Record<CollectionTab, CollectionEntry[]>>(
    () => ({
      character: initialCharacters.map((character) => ({
        id: character.id,
        name: character.name,
        owned: save.inventory.characterIds.includes(character.id),
      })),
      weapon: initialWeapons.map((weapon) => ({
        id: weapon.id,
        name: weapon.name,
        owned: save.inventory.weaponIds.includes(weapon.id),
      })),
      summon: initialSummons.map((summon) => ({
        id: summon.id,
        name: summon.name,
        owned: save.inventory.summonIds.includes(summon.id),
      })),
    }),
    [save.inventory.characterIds, save.inventory.weaponIds, save.inventory.summonIds],
  );

  const allCollectionCells = useMemo<Record<CollectionTab, CollectionEntry[]>>(
    () => ({
      character: buildCollectionCells(collectionEntries.character),
      weapon: buildCollectionCells(collectionEntries.weapon),
      summon: buildCollectionCells(collectionEntries.summon),
    }),
    [collectionEntries],
  );

  const resourcePageCount = Math.max(1, Math.ceil(resources.length / RESOURCE_PAGE_SIZE));
  const safeResourcePage = clampPage(resourcePage, resourcePageCount);
  const visibleResources = resources.slice(safeResourcePage * RESOURCE_PAGE_SIZE, safeResourcePage * RESOURCE_PAGE_SIZE + RESOURCE_PAGE_SIZE);

  const activeCollectionCells = allCollectionCells[collectionTab];
  const collectionPageCount = Math.max(1, Math.ceil(activeCollectionCells.length / COLLECTION_PAGE_SIZE));
  const rawCollectionPage = collectionPageByTab[collectionTab] ?? 0;
  const safeCollectionPage = clampPage(rawCollectionPage, collectionPageCount);
  const visibleCollectionCells = activeCollectionCells.slice(
    safeCollectionPage * COLLECTION_PAGE_SIZE,
    safeCollectionPage * COLLECTION_PAGE_SIZE + COLLECTION_PAGE_SIZE,
  );

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

      <section className="panel content-panel inventory-screen-panel inventory-layout-panel">
        <section className="panel inventory-section-panel inventory-resource-section">
          <div className="inventory-section-head">
            <h2>资源</h2>
          </div>
          <div className="inventory-fixed-panel" data-testid="inventory-resource-panel">
            <div className="inventory-resource-grid" data-testid="inventory-resource-grid">
              {visibleResources.map((resource) => (
                <button className="inventory-resource-card" data-testid={`inventory-resource-card-${resource.id}`} key={resource.id} type="button">
                  <div className="inventory-resource-icon" data-testid={`inventory-resource-icon-${resource.id}`}>
                    <IconBadge label={resource.label} />
                  </div>
                  <div className="inventory-resource-copy">
                    <strong>{resource.label}</strong>
                    <span>{resource.quantity}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="inventory-pagination">
            <button
              className="secondary-button"
              data-testid="inventory-resource-prev"
              disabled={safeResourcePage <= 0}
              type="button"
              onClick={() => setResourcePage((page) => clampPage(page - 1, resourcePageCount))}
            >
              上一页
            </button>
            <span data-testid="inventory-resource-page-indicator">
              {safeResourcePage + 1} / {resourcePageCount}
            </span>
            <button
              className="secondary-button"
              data-testid="inventory-resource-next"
              disabled={safeResourcePage >= resourcePageCount - 1}
              type="button"
              onClick={() => setResourcePage((page) => clampPage(page + 1, resourcePageCount))}
            >
              下一页
            </button>
          </div>
        </section>

        <section className="panel inventory-section-panel inventory-collection-panel inventory-collection-section">
          <div className="inventory-section-head">
            <h2>图鉴</h2>
          </div>
          <div className="inventory-collection-tabbar" role="tablist" aria-label="图鉴分页">
            {[
              ['character', '角色图鉴'],
              ['weapon', '武器图鉴'],
              ['summon', '召唤石图鉴'],
            ].map(([value, label]) => (
              <button
                aria-selected={collectionTab === value}
                className={collectionTab === value ? 'inventory-collection-tab inventory-collection-tab-active' : 'inventory-collection-tab'}
                key={value}
                role="tab"
                type="button"
                onClick={() => setCollectionTab(value as CollectionTab)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inventory-fixed-panel" data-testid="inventory-collection-panel">
            <div className="inventory-collection-grid" data-testid="inventory-collection-grid">
              {visibleCollectionCells.map((entry) => {
                const isPlaceholder = entry.id.startsWith('placeholder-');
                const locked = !entry.owned;

                return (
                  <div
                    className={locked ? 'inventory-collection-card inventory-collection-card-locked' : 'inventory-collection-card'}
                    data-testid={isPlaceholder ? undefined : `inventory-collection-card-${entry.id}`}
                    key={entry.id}
                  >
                    <div className="inventory-collection-cell" data-testid={`inventory-collection-grid-cell-${entry.id}`}>
                      <div className="inventory-collection-icon">
                        <IconBadge label={entry.name} />
                      </div>
                      <strong>{locked ? '???' : entry.name}</strong>
                      <span>{locked ? '未获得' : '已获得'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="inventory-pagination">
            <button
              className="secondary-button"
              data-testid="inventory-collection-prev"
              disabled={safeCollectionPage <= 0}
              type="button"
              onClick={() =>
                setCollectionPageByTab((current) => ({
                  ...current,
                  [collectionTab]: clampPage((current[collectionTab] ?? 0) - 1, collectionPageCount),
                }))
              }
            >
              上一页
            </button>
            <span data-testid="inventory-collection-page-indicator">
              {safeCollectionPage + 1} / {collectionPageCount}
            </span>
            <button
              className="secondary-button"
              data-testid="inventory-collection-next"
              disabled={safeCollectionPage >= collectionPageCount - 1}
              type="button"
              onClick={() =>
                setCollectionPageByTab((current) => ({
                  ...current,
                  [collectionTab]: clampPage((current[collectionTab] ?? 0) + 1, collectionPageCount),
                }))
              }
            >
              下一页
            </button>
          </div>
        </section>

        <section className="panel content-panel inventory-tools-panel">
          <h2>存档工具</h2>
          <div className="actions inventory-tools-actions">
            <button className="primary-button" type="button" onClick={handleExport}>
              导出存档
            </button>
            <button className="secondary-button" type="button" onClick={handleImport}>
              导入存档
            </button>
          </div>
          <textarea aria-label="存档 JSON" className="save-textarea inventory-save-textarea" value={saveJson} onChange={(event) => setSaveJson(event.target.value)} />
          {message ? <p className="status-text">{message}</p> : null}
        </section>
      </section>
    </>
  );
}
