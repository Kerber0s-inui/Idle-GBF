import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { initialCharacters, initialSummons, initialWeapons } from '../../domain/content';
import {
  getCharacterUncapOptions,
  getCharacterUpgradeOptions,
  getSummonUncapOptions,
  getSummonUpgradeOptions,
  getWeaponSkillUpgradeOptions,
  getWeaponUncapOptions,
  getWeaponUpgradeOptions,
  previewCharacterUncap,
  previewCharacterUpgrade,
  previewSummonDismantle,
  previewSummonUncap,
  previewSummonUpgrade,
  previewWeaponDismantle,
  previewWeaponSkillUpgrade,
  previewWeaponUncap,
  previewWeaponUpgrade,
  type DismantlePreviewResult,
  type GrowthActionKind,
  type GrowthPreviewResult,
  type GrowthSelectionDefinition,
} from '../../domain/growth';
import {
  applyCharacterProgression,
  applySummonProgression,
  applyWeaponProgression,
  getUnlockedCharacterPassives,
  getUncapProgressVisual,
} from '../../domain/progression';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';

type UpgradeTab = 'character' | 'weapon' | 'summon';
type ActionState =
  | { tab: 'character'; itemId: string }
  | { tab: 'weapon'; itemId: string }
  | { tab: 'summon'; itemId: string }
  | null;

type OperationState =
  | { tab: 'character'; itemId: string; definition: GrowthSelectionDefinition }
  | { tab: 'weapon'; itemId: string; definition: GrowthSelectionDefinition }
  | { tab: 'summon'; itemId: string; definition: GrowthSelectionDefinition }
  | { tab: 'weapon'; itemId: string; dismantle: true }
  | { tab: 'summon'; itemId: string; dismantle: true }
  | null;

type GridItem = {
  id: string;
  name: string;
  level: number;
  levelCap: number;
  atk?: number;
  hp?: number;
  defense?: number;
  comboRate?: number;
  skillLevel?: number;
  skillLines?: string[];
  uncap: number;
  equipped: boolean;
};

type StatPreviewRow = {
  label: string;
  current: number;
  next: number;
};

type TextPreviewRow = {
  label: string;
  current: string;
  next: string;
};

const PAGE_SIZE = 12;
const PICKER_ITEM_HEIGHT = 56;
const PICKER_VISIBLE_ROWS = 5;
const PICKER_VIEWPORT_HEIGHT = PICKER_ITEM_HEIGHT * PICKER_VISIBLE_ROWS;
const PICKER_SIDE_PADDING = (PICKER_VIEWPORT_HEIGHT - PICKER_ITEM_HEIGHT) / 2;

function isDismantlePreview(result: GrowthPreviewResult | DismantlePreviewResult | null): result is DismantlePreviewResult {
  return Boolean(result && 'rewards' in result);
}

function getWeaponSkillLines(item: GridItem) {
  const lines = item.skillLines ?? [];
  return [lines[0] ?? '\u00A0', lines[1] ?? '\u00A0'];
}

function formatRatePercent(value: number) {
  const percentValue = value * 100;
  return Number.isInteger(percentValue) ? `${percentValue}%` : `${percentValue.toFixed(1)}%`;
}

function buildStatPreviewRows(preview: GrowthPreviewResult | null): StatPreviewRow[] {
  if (!preview) return [];
  const pairs: Array<{ label: string; current?: number; next?: number }> = [
    { label: '攻', current: preview.current.atk, next: preview.next.atk },
    { label: '防', current: preview.current.defense, next: preview.next.defense },
    { label: 'HP', current: preview.current.hp, next: preview.next.hp },
  ];

  return pairs
    .filter((pair) => pair.current !== undefined || pair.next !== undefined)
    .map((pair) => ({ label: pair.label, current: pair.current ?? 0, next: pair.next ?? 0 }));
}

function buildSkillPreviewRows(preview: GrowthPreviewResult | null): TextPreviewRow[] {
  if (!preview) return [];
  const currentLines = preview.current.skillLines ?? [];
  const nextLines = preview.next.skillLines ?? [];
  const maxLength = Math.max(currentLines.length, nextLines.length, 2);

  return Array.from({ length: maxLength }, (_, index) => ({
    label: `词条${index + 1}`,
    current: currentLines[index] ?? '—',
    next: nextLines[index] ?? '—',
  })).filter((row) => row.current !== '—' || row.next !== '—');
}

function getActionLabel(action: GrowthActionKind) {
  switch (action) {
    case 'characterUpgrade':
    case 'weaponUpgrade':
    case 'summonUpgrade':
      return '升级';
    case 'weaponSkillUpgrade':
      return '词条升级';
    case 'characterUncap':
    case 'weaponUncap':
    case 'summonUncap':
      return '突破';
    case 'weaponDismantle':
    case 'summonDismantle':
      return '拆解';
  }
}

function clampIndex(index: number, optionsLength: number) {
  return Math.min(Math.max(index, 0), Math.max(0, optionsLength - 1));
}

function scrollPickerViewport(element: HTMLDivElement | null, top: number, behavior: ScrollBehavior = 'auto') {
  if (!element) return;
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top, behavior });
    return;
  }
  element.scrollTop = top;
}

function renderStars(item: GridItem, canTranscend: boolean, emphasis: 'default' | 'large' = 'default') {
  const visual = getUncapProgressVisual({
    uncap: item.uncap,
    rule: {
      normalUncapCount: 3,
      transcendenceEnabled: canTranscend,
      transcendenceStepCount: 5,
    },
  });

  return (
    <div className={emphasis === 'large' ? 'upgrade-stars upgrade-stars-large' : 'upgrade-stars'} aria-label={`突破 ${item.uncap}`}>
      {Array.from({ length: visual.mainStars }, (_, index) => {
        const filled = index < visual.filledMainStars;
        const className = filled
          ? `upgrade-star ${index === visual.mainStars - 1 ? 'upgrade-star-final' : 'upgrade-star-filled'}`
          : 'upgrade-star';

        return (
          <span className={className} key={`${item.id}-star-${index}`}>
            {filled ? '★' : '☆'}
          </span>
        );
      })}
      {visual.hasTranscendenceStar ? (
        <span className={visual.transcendenceFill > 0 ? 'upgrade-star upgrade-star-transcend' : 'upgrade-star'}>
          {visual.transcendenceFill > 0 ? `★${Math.round(visual.transcendenceFill * 5)}/5` : '☆'}
        </span>
      ) : null}
    </div>
  );
}

function getOperationPreview(save: ReturnType<typeof useGame>['save'], operationState: OperationState, targetValue: number) {
  if (!operationState) return null;
  if ('dismantle' in operationState) {
    return operationState.tab === 'weapon' ? previewWeaponDismantle(save, operationState.itemId) : previewSummonDismantle(save, operationState.itemId);
  }

  switch (operationState.definition.action) {
    case 'characterUpgrade':
      return previewCharacterUpgrade(save, operationState.itemId, targetValue);
    case 'characterUncap':
      return previewCharacterUncap(save, operationState.itemId, targetValue);
    case 'weaponUpgrade':
      return previewWeaponUpgrade(save, operationState.itemId, targetValue);
    case 'weaponSkillUpgrade':
      return previewWeaponSkillUpgrade(save, operationState.itemId, targetValue);
    case 'weaponUncap':
      return previewWeaponUncap(save, operationState.itemId, targetValue);
    case 'summonUpgrade':
      return previewSummonUpgrade(save, operationState.itemId, targetValue);
    case 'summonUncap':
      return previewSummonUncap(save, operationState.itemId, targetValue);
    default:
      return null;
  }
}

function itemStarEmphasis(_tab: UpgradeTab): 'default' | 'large' {
  return 'large';
}

function canItemTranscend(tab: UpgradeTab, item: GridItem) {
  if (tab === 'character') return item.levelCap > 100 || item.uncap > 3;
  return item.levelCap > 100 || item.uncap > 3;
}

function renderCardMeta(tab: UpgradeTab, item: GridItem) {
  if (tab === 'character') {
    return (
      <>
        <span>{`Lv.${item.level}/${item.levelCap}`}</span>
        <small className="upgrade-card-stat-row">
          <span className="upgrade-card-stat-entry">{`攻 ${item.atk ?? 0}`}</span>
          <span className="upgrade-card-stat-entry">{`防 ${item.defense ?? 0}`}</span>
        </small>
        <small className="upgrade-card-stat-row">
          <span className="upgrade-card-stat-entry">{`HP ${item.hp ?? 0}`}</span>
          <span className="upgrade-card-stat-entry">{`连 ${formatRatePercent(item.comboRate ?? 0)}`}</span>
        </small>
      </>
    );
  }

  if (item.skillLevel) {
    return (
      <>
        <span>{`Lv.${item.level}/${item.levelCap}  SLv.${item.skillLevel}`}</span>
        {getWeaponSkillLines(item).map((line, index) => (
          <small
            className={line === '\u00A0' ? 'upgrade-card-skill-line upgrade-card-skill-line-empty' : 'upgrade-card-skill-line'}
            key={`${item.id}-skill-line-${index}`}
          >
            {line}
          </small>
        ))}
      </>
    );
  }

  return (
    <>
      <span>{`Lv.${item.level}/${item.levelCap}`}</span>
      <small className="upgrade-card-stat-row">
        <span className="upgrade-card-stat-entry">{`攻 ${item.atk ?? 0}`}</span>
        <span className="upgrade-card-stat-entry">{`防 ${item.defense ?? 0}`}</span>
      </small>
      <small className="upgrade-card-stat-row">
        <span className="upgrade-card-stat-entry">{`HP ${item.hp ?? 0}`}</span>
        <span className="upgrade-card-stat-entry">{'\u00A0'}</span>
      </small>
    </>
  );
}

function buildCompactSummary(preview: GrowthPreviewResult, action: GrowthActionKind) {
  if (action === 'characterUpgrade' || action === 'weaponUpgrade' || action === 'summonUpgrade') {
    return preview.costs.map((cost) => ({ label: cost.label, value: `${cost.quantity}` }));
  }

  if (action === 'weaponSkillUpgrade') {
    return preview.costs.map((cost) => ({ label: cost.label, value: `${cost.quantity}` }));
  }

  if (action === 'characterUncap' || action === 'weaponUncap' || action === 'summonUncap') {
    return [{ label: '等级上限', value: `${preview.current.levelCap ?? 0} -> ${preview.next.levelCap ?? preview.current.levelCap ?? 0}` }, ...preview.costs.map((cost) => ({ label: cost.label, value: `${cost.quantity}` }))];
  }

  return preview.costs.map((cost) => ({ label: cost.label, value: `${cost.quantity}` }));
}

export function UpgradeScreen() {
  const {
    save,
    dismantleSummon,
    dismantleWeapon,
    uncapCharacter,
    uncapSummon,
    uncapWeapon,
    upgradeCharacter,
    upgradeSummon,
    upgradeWeapon,
    upgradeWeaponSkill,
  } = useGame();
  const [tab, setTab] = useState<UpgradeTab>('weapon');
  const [pageByTab, setPageByTab] = useState<Record<UpgradeTab, number>>({ character: 0, weapon: 0, summon: 0 });
  const [message, setMessage] = useState('');
  const [actionState, setActionState] = useState<ActionState>(null);
  const [operationState, setOperationState] = useState<OperationState>(null);
  const [targetValue, setTargetValue] = useState<number | null>(null);
  const pickerViewportRef = useRef<HTMLDivElement | null>(null);

  const characters = useMemo<GridItem[]>(
    () =>
      save.inventory.characterIds.map((id) => {
        const character = initialCharacters.find((candidate) => candidate.id === id);
        const progressed = character ? applyCharacterProgression(character, save.characterStates[id]) : null;
        const state = save.characterStates[id];
        const comboRate = progressed
          ? getUnlockedCharacterPassives(progressed, state)
              .flatMap((passive) => passive.modifiers)
              .reduce((total, modifier) => total + (modifier.type === 'doubleAttackRate' ? modifier.value : 0), 0)
          : 0;
        return {
          id,
          name: progressed?.name ?? id,
          level: state?.level ?? progressed?.level ?? 1,
          levelCap: state?.levelCap ?? progressed?.maxLevel ?? 40,
          atk: progressed?.stats.atk,
          hp: progressed?.stats.hp,
          defense: progressed?.stats.defense,
          comboRate,
          uncap: state?.uncap ?? 0,
          equipped: save.formation.characterIds.includes(id),
        };
      }),
    [save],
  );

  const weapons = useMemo<GridItem[]>(
    () =>
      save.inventory.weaponIds.map((id) => {
        const weapon = initialWeapons.find((candidate) => candidate.id === id);
        const progressed = weapon ? applyWeaponProgression(weapon, save.weaponStates[id]) : null;
        const state = save.weaponStates[id];
        return {
          id,
          name: progressed?.name ?? id,
          level: state?.level ?? progressed?.level ?? 1,
          levelCap: state?.levelCap ?? progressed?.maxLevel ?? 40,
          atk: progressed?.stats.atk,
          hp: progressed?.stats.hp,
          defense: progressed?.stats.defense,
          skillLevel: state?.skillLevel ?? progressed?.skills[0]?.level ?? 1,
          skillLines: progressed?.skills.slice(0, 2).map((skill) => skill.modifiers.map((modifier) => modifier.label).join(' / ')) ?? [],
          uncap: state?.uncap ?? 0,
          equipped: save.formation.weaponIds.includes(id),
        };
      }),
    [save],
  );

  const summons = useMemo<GridItem[]>(
    () =>
      save.inventory.summonIds.map((id) => {
        const summon = initialSummons.find((candidate) => candidate.id === id);
        const progressed = summon ? applySummonProgression(summon, save.summonStates[id]) : null;
        const state = save.summonStates[id];
        return {
          id,
          name: progressed?.name ?? id,
          level: state?.level ?? progressed?.level ?? 1,
          levelCap: state?.levelCap ?? progressed?.maxLevel ?? 40,
          atk: progressed?.stats.atk,
          hp: progressed?.stats.hp,
          defense: progressed?.stats.defense,
          uncap: state?.uncap ?? 0,
          equipped: save.formation.summonIds.includes(id),
        };
      }),
    [save],
  );

  const items = tab === 'character' ? characters : tab === 'weapon' ? weapons : summons;
  const currentPage = pageByTab[tab];
  const maxPage = Math.max(0, Math.ceil(items.length / PAGE_SIZE) - 1);
  const visibleItems = items.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const currentActionItem = actionState
    ? (actionState.tab === 'character' ? characters : actionState.tab === 'weapon' ? weapons : summons).find((item) => item.id === actionState.itemId) ?? null
    : null;
  const currentOperationItem = operationState
    ? (operationState.tab === 'character' ? characters : operationState.tab === 'weapon' ? weapons : summons).find((item) => item.id === operationState.itemId) ?? null
    : null;

  const currentPreview = useMemo(() => {
    if (!operationState) return null;
    try {
      if ('dismantle' in operationState) return { result: getOperationPreview(save, operationState, 0) as DismantlePreviewResult, error: null };
      const resolvedTarget = targetValue ?? operationState.definition.options[0]?.value ?? operationState.definition.currentValue;
      return { result: getOperationPreview(save, operationState, resolvedTarget) as GrowthPreviewResult, error: null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : '预览失败' };
    }
  }, [operationState, save, targetValue]);

  const previewResult = currentPreview?.result ?? null;
  const dismantlePreviewResult = isDismantlePreview(previewResult) ? previewResult : null;
  const dismantleRewards = dismantlePreviewResult?.rewards ?? [];
  const pickerOptions = operationState && !('dismantle' in operationState) ? operationState.definition.options : [];
  const fallbackPickerValue = operationState && !('dismantle' in operationState) ? operationState.definition.currentValue : null;
  const selectedPickerValue = targetValue ?? fallbackPickerValue;
  const selectedPickerIndex = clampIndex(pickerOptions.findIndex((option) => option.value === selectedPickerValue), pickerOptions.length);

  useEffect(() => {
    if (!pickerViewportRef.current || pickerOptions.length === 0) return;
    scrollPickerViewport(pickerViewportRef.current, selectedPickerIndex * PICKER_ITEM_HEIGHT);
  }, [selectedPickerIndex, pickerOptions.length, operationState]);

  const openActionModal = (nextTab: UpgradeTab, itemId: string) => {
    setActionState({ tab: nextTab, itemId });
    setOperationState(null);
    setTargetValue(null);
    setMessage('');
  };

  const closeActionModal = () => setActionState(null);
  const closeOperation = () => setOperationState(null);

  const openOperation = (nextOperation: OperationState) => {
    setOperationState(nextOperation);
    setActionState(null);
    if (nextOperation && !('dismantle' in nextOperation)) {
      setTargetValue(nextOperation.definition.options[0]?.value ?? nextOperation.definition.currentValue);
    } else {
      setTargetValue(null);
    }
  };

  const setPage = (nextPage: number) => {
    setPageByTab((current) => ({ ...current, [tab]: Math.min(maxPage, Math.max(0, nextPage)) }));
  };

  const runAction = (handler: () => void, successMessage: string) => {
    try {
      handler();
      setMessage(successMessage);
      setOperationState(null);
      setActionState(null);
      setTargetValue(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  };

  const confirmOperation = () => {
    if (!operationState || !currentPreview?.result) return;

    if ('dismantle' in operationState) {
      runAction(
        () => (operationState.tab === 'weapon' ? dismantleWeapon(operationState.itemId) : dismantleSummon(operationState.itemId)),
        `${currentOperationItem?.name ?? '目标'}已拆解`,
      );
      return;
    }

    switch (operationState.definition.action) {
      case 'characterUpgrade':
        runAction(() => upgradeCharacter(operationState.itemId, targetValue ?? operationState.definition.currentValue), '角色升级完成');
        return;
      case 'characterUncap':
        runAction(() => uncapCharacter(operationState.itemId, targetValue ?? operationState.definition.currentValue), '角色突破完成');
        return;
      case 'weaponUpgrade':
        runAction(() => upgradeWeapon(operationState.itemId, targetValue ?? operationState.definition.currentValue), '武器升级完成');
        return;
      case 'weaponSkillUpgrade':
        runAction(() => upgradeWeaponSkill(operationState.itemId, targetValue ?? operationState.definition.currentValue), '武器词条升级完成');
        return;
      case 'weaponUncap':
        runAction(() => uncapWeapon(operationState.itemId, targetValue ?? operationState.definition.currentValue), '武器突破完成');
        return;
      case 'summonUpgrade':
        runAction(() => upgradeSummon(operationState.itemId, targetValue ?? operationState.definition.currentValue), '召唤石升级完成');
        return;
      case 'summonUncap':
        runAction(() => uncapSummon(operationState.itemId, targetValue ?? operationState.definition.currentValue), '召唤石突破完成');
    }
  };

  const characterActions = (itemId: string) => [
    { label: '升级', open: () => openOperation({ tab: 'character', itemId, definition: getCharacterUpgradeOptions(save, itemId) }) },
    { label: '突破', open: () => openOperation({ tab: 'character', itemId, definition: getCharacterUncapOptions(save, itemId) }) },
  ];
  const weaponActions = (itemId: string) => [
    { label: '升级', open: () => openOperation({ tab: 'weapon', itemId, definition: getWeaponUpgradeOptions(save, itemId) }) },
    { label: '词条升级', open: () => openOperation({ tab: 'weapon', itemId, definition: getWeaponSkillUpgradeOptions(save, itemId) }) },
    { label: '突破', open: () => openOperation({ tab: 'weapon', itemId, definition: getWeaponUncapOptions(save, itemId) }) },
    { label: '拆解', open: () => openOperation({ tab: 'weapon', itemId, dismantle: true }) },
  ];
  const summonActions = (itemId: string) => [
    { label: '升级', open: () => openOperation({ tab: 'summon', itemId, definition: getSummonUpgradeOptions(save, itemId) }) },
    { label: '突破', open: () => openOperation({ tab: 'summon', itemId, definition: getSummonUncapOptions(save, itemId) }) },
    { label: '拆解', open: () => openOperation({ tab: 'summon', itemId, dismantle: true }) },
  ];

  const compactRows =
    currentPreview?.result && !isDismantlePreview(currentPreview.result) && operationState && !('dismantle' in operationState)
      ? buildCompactSummary(currentPreview.result, operationState.definition.action)
      : [];
  const statPreviewRows =
    currentPreview?.result &&
    !isDismantlePreview(currentPreview.result) &&
    operationState &&
    !('dismantle' in operationState) &&
    (operationState.definition.action === 'characterUpgrade' ||
      operationState.definition.action === 'weaponUpgrade' ||
      operationState.definition.action === 'summonUpgrade')
      ? buildStatPreviewRows(currentPreview.result)
      : [];
  const skillPreviewRows =
    currentPreview?.result &&
    !isDismantlePreview(currentPreview.result) &&
    operationState &&
    !('dismantle' in operationState) &&
    operationState.definition.action === 'weaponSkillUpgrade'
      ? buildSkillPreviewRows(currentPreview.result)
      : [];

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">成长</p>
        <h1 id="screen-title">强化</h1>
      </header>

      <section className="panel content-panel upgrade-screen-panel">
        <div className="upgrade-material-strip">
          <span>角色突破素材</span>
          <span>武器突破块</span>
          <span>召唤石突破核</span>
        </div>

        <div className="upgrade-tabbar" role="tablist" aria-label="强化分页">
          {[
            ['character', '角色'],
            ['weapon', '武器'],
            ['summon', '召唤石'],
          ].map(([value, label]) => (
            <button
              aria-selected={tab === value}
              className={tab === value ? 'upgrade-tab upgrade-tab-active' : 'upgrade-tab'}
              data-testid={`${value}-tab`}
              key={value}
              role="tab"
              type="button"
              onClick={() => setTab(value as UpgradeTab)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="upgrade-grid" data-testid={`${tab}-grid`}>
          {visibleItems.map((item) => (
            <button
              className={tab === 'character' ? 'upgrade-card upgrade-card-character' : 'upgrade-card'}
              data-testid={`${tab}-card-${item.id}`}
              key={item.id}
              type="button"
              onClick={() => openActionModal(tab, item.id)}
            >
              {item.equipped ? <span className="upgrade-equipped-badge">编成中</span> : null}
              <div className="upgrade-card-icon">
                <IconBadge label={item.name} />
              </div>
              <div className="upgrade-card-body">
                <strong>{item.name}</strong>
                <div className="upgrade-card-meta">{renderCardMeta(tab, item)}</div>
                {renderStars(item, canItemTranscend(tab, item), itemStarEmphasis(tab))}
              </div>
            </button>
          ))}
        </div>

        <div className="upgrade-pagination">
          <button className="secondary-button" disabled={currentPage <= 0} type="button" onClick={() => setPage(currentPage - 1)}>
            上一页
          </button>
          <span data-testid={`${tab}-page-indicator`}>
            {currentPage + 1} / {maxPage + 1}
          </span>
          <button className="secondary-button" disabled={currentPage >= maxPage} type="button" onClick={() => setPage(currentPage + 1)}>
            下一页
          </button>
        </div>
      </section>

      {message ? <p className="status-text">{message}</p> : null}

      {actionState && currentActionItem ? (
        <div className="slot-picker-backdrop upgrade-overlay" data-testid="upgrade-action-modal" onClick={closeActionModal}>
          <div aria-modal="true" className="upgrade-action-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="upgrade-action-head">
              <IconBadge label={currentActionItem.name} />
              <div className="upgrade-action-copy">
                <strong>{currentActionItem.name}</strong>
                <span>
                  Lv.{currentActionItem.level}/{currentActionItem.levelCap}
                  {currentActionItem.skillLevel ? ` / SLv.${currentActionItem.skillLevel}` : ''}
                </span>
                {renderStars(currentActionItem, canItemTranscend(actionState.tab, currentActionItem), itemStarEmphasis(actionState.tab))}
              </div>
            </div>
            <div className="upgrade-action-buttons">
              {(actionState.tab === 'character'
                ? characterActions(actionState.itemId)
                : actionState.tab === 'weapon'
                  ? weaponActions(actionState.itemId)
                  : summonActions(actionState.itemId)
              ).map((action) => (
                <button className="secondary-button" data-testid={`action-${action.label}`} key={action.label} type="button" onClick={action.open}>
                  {action.label}
                </button>
              ))}
              <button className="secondary-button" type="button" onClick={closeActionModal}>
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {operationState ? (
        <div className="slot-picker-backdrop upgrade-overlay" data-testid="upgrade-confirm-dialog" onClick={closeOperation}>
          <div aria-modal="true" className="slot-picker-modal upgrade-modal upgrade-large-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="upgrade-compact-header">
              <div className="upgrade-compact-titleblock">
                <strong className="upgrade-compact-name">{currentOperationItem?.name ?? ''}</strong>
                <h3 className="upgrade-compact-title">{'dismantle' in operationState ? '拆解' : getActionLabel(operationState.definition.action)}</h3>
              </div>
            </div>

            <div className="upgrade-operation-body upgrade-operation-body-compact">
              {'dismantle' in operationState ? (
                <div className="panel upgrade-preview-panel upgrade-preview-panel-compact">
                  {dismantleRewards.map((reward) => (
                    <div className="stat-row" key={reward.materialId}>
                      <span>{reward.label}</span>
                      <strong>{reward.quantity}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="upgrade-compact-meta">
                    <div className="upgrade-preview-summary">
                      <div className="upgrade-preview-icon">
                        <IconBadge label={currentOperationItem?.name ?? ''} />
                      </div>
                      <div className="upgrade-preview-copy">
                        <strong>{currentOperationItem?.name}</strong>
                        <span>
                          Lv.{currentOperationItem?.level ?? 1}/{currentOperationItem?.levelCap ?? 1}
                          {currentOperationItem?.skillLevel ? ` / SLv.${currentOperationItem.skillLevel}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <label className="field upgrade-target-field upgrade-target-field-compact" htmlFor="upgrade-target-select">
                    <span className="upgrade-target-label">{operationState.definition.targetLabel}</span>
                    <div
                      className="upgrade-wheel-picker"
                      data-testid="upgrade-target-select"
                      id="upgrade-target-select"
                      style={
                        {
                          '--upgrade-picker-item-height': `${PICKER_ITEM_HEIGHT}px`,
                          '--upgrade-picker-viewport-height': `${PICKER_VIEWPORT_HEIGHT}px`,
                        } as CSSProperties
                      }
                    >
                      <div className="upgrade-wheel-highlight" />
                      <div
                        className="upgrade-wheel-viewport"
                        data-testid="upgrade-target-options"
                        ref={pickerViewportRef}
                        role="listbox"
                        tabIndex={0}
                        onScroll={(event) => {
                          const nextIndex = clampIndex(Math.round(event.currentTarget.scrollTop / PICKER_ITEM_HEIGHT), pickerOptions.length);
                          const nextValue = pickerOptions[nextIndex]?.value;
                          if (nextValue !== undefined && nextValue !== targetValue) setTargetValue(nextValue);
                        }}
                      >
                        <div style={{ paddingTop: `${PICKER_SIDE_PADDING}px`, paddingBottom: `${PICKER_SIDE_PADDING}px` }}>
                          {pickerOptions.map((option, index) => (
                            <button
                              aria-selected={index === selectedPickerIndex}
                              className={index === selectedPickerIndex ? 'upgrade-wheel-option upgrade-wheel-option-active' : 'upgrade-wheel-option'}
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setTargetValue(option.value);
                                scrollPickerViewport(pickerViewportRef.current, index * PICKER_ITEM_HEIGHT, 'smooth');
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </label>

                  <div className="panel upgrade-preview-panel upgrade-preview-panel-compact">
                    {compactRows.map((row, index) => {
                      const shouldPrefixCost =
                        operationState &&
                        !('dismantle' in operationState) &&
                        (operationState.definition.action === 'characterUpgrade' ||
                          operationState.definition.action === 'weaponUpgrade' ||
                          operationState.definition.action === 'summonUpgrade'
                          ? true
                          : index > 0);

                      return (
                        <div className="stat-row" key={`${row.label}-${row.value}`}>
                          <span>{shouldPrefixCost ? `消耗${row.label}` : row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      );
                    })}
                    {statPreviewRows.length > 0 || skillPreviewRows.length > 0 ? <div className="upgrade-preview-divider" /> : null}
                    {statPreviewRows.map((row) => (
                      <div className="stat-row" key={`stat-preview-${row.label}`}>
                        <span>{row.label}</span>
                        <strong>{`${row.current} -> ${row.next}`}</strong>
                      </div>
                    ))}
                    {skillPreviewRows.map((row) => (
                      <div className="stat-row upgrade-skill-preview-row" key={`skill-preview-${row.label}`}>
                        <span>{row.label}</span>
                        <strong>{`${row.current} -> ${row.next}`}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {currentPreview?.error ? <p className="status-text">{currentPreview.error}</p> : null}

              <div className="actions upgrade-compact-actions">
                <button className="primary-button" type="button" onClick={confirmOperation}>
                  确认
                </button>
                <button className="secondary-button" type="button" onClick={closeOperation}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
