import { useState } from 'react';
import { initialCharacters, initialSummons, initialWeapons } from '../../domain/content';
import { createSummonGrid, createWeaponGrid, type FormationSlot } from '../../domain/formation';
import { BOND_RULES, buildPartyPreviewSummary } from '../../domain/partyBonuses';
import { applyCharacterProgression, applySummonProgression, applyWeaponProgression } from '../../domain/progression';
import type { Character, Element, Summon, Weapon } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';
import { StatBreakdown } from '../components/StatBreakdown';

type EquipmentKind = 'weapon' | 'summon';
type EquipmentPage = 'weapon' | 'summon';

type PickerState =
  | { kind: 'character'; slotIndex: number }
  | { kind: 'weapon'; slotIndex: number }
  | { kind: 'summon'; slotIndex: number }
  | null;

const formationTabs: Array<{ element: Element; label: string }> = [
  { element: 'fire', label: '火' },
  { element: 'water', label: '水' },
  { element: 'earth', label: '土' },
  { element: 'wind', label: '风' },
  { element: 'light', label: '光' },
  { element: 'dark', label: '暗' },
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function findSlotName(slot: FormationSlot, kind: EquipmentKind) {
  if (!slot.itemId) return '空槽';
  const source = kind === 'weapon' ? initialWeapons : initialSummons;
  return source.find((item) => item.id === slot.itemId)?.name ?? slot.itemId;
}

function weaponLevelText(weaponId: string | null, weaponStates: ReturnType<typeof useGame>['save']['weaponStates']) {
  if (!weaponId) return null;
  const state = weaponStates[weaponId];
  return `Lv.${state?.level ?? 1} / SLv.${state?.skillLevel ?? 1}`;
}

function summonLevelText(summonId: string | null, summonStates: ReturnType<typeof useGame>['save']['summonStates']) {
  if (!summonId) return null;
  const state = summonStates[summonId];
  return `Lv.${state?.level ?? 1}`;
}

function characterLevelText(characterId: string, characterStates: ReturnType<typeof useGame>['save']['characterStates']) {
  const state = characterStates[characterId];
  return `Lv.${state?.level ?? 1}`;
}

function weaponEffectText(weapon: Weapon | undefined) {
  if (!weapon) return '无词条效果';
  return weapon.skills.flatMap((skill) => skill.modifiers.map((modifier) => modifier.label)).join(' / ');
}

function getCharacterTags(character: Character | undefined) {
  return character?.bondTags ?? [];
}

function renderSlot(input: {
  slot: FormationSlot;
  kind: EquipmentKind;
  levelText: string | null;
  testId: string;
  triggerTestId: string;
  extraClassName?: string;
  onClick: () => void;
}) {
  const { extraClassName, kind, levelText, onClick, slot, testId, triggerTestId } = input;
  const name = findSlotName(slot, kind);
  const className = ['equipment-slot', slot.kind === 'empty' ? 'empty-slot' : '', extraClassName ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={`${className} equipment-slot-button`}
      data-testid={triggerTestId}
      key={`${kind}-${slot.index}`}
      type="button"
      onClick={onClick}
    >
      <div data-testid={testId}>
        {slot.kind === 'empty' ? <span aria-hidden="true" className="icon-badge">+</span> : <IconBadge label={name} />}
        <strong>{name}</strong>
        {levelText ? <small>{levelText}</small> : null}
      </div>
    </button>
  );
}

function renderCharacterSlot(input: {
  character: Character | undefined;
  slotIndex: number;
  levelText: string;
  onClick: () => void;
}) {
  const { character, levelText, onClick, slotIndex } = input;
  const name = character?.name ?? '未配置';

  return (
    <button
      key={`character-slot-${slotIndex}`}
      className="formation-character-card"
      data-testid={`character-slot-trigger-${slotIndex}`}
      type="button"
      onClick={onClick}
    >
      <div className="formation-character-badge">
        <IconBadge label={name} />
      </div>
      <div className="formation-character-copy">
        <strong>{name}</strong>
        <small>{character?.rarity ?? 'SSR'}</small>
        <small>{levelText}</small>
        <div className="formation-character-tags">
          {getCharacterTags(character).map((tag) => (
            <span className="formation-tag" key={`${character?.id ?? name}-${tag}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function renderEffectGroup(input: {
  label: string;
  entries: Array<{ id: string; name: string; detail: string }>;
}) {
  return (
    <section className="formation-effect-group" key={input.label}>
      <h3>{input.label}</h3>
      <div className="formation-effect-list">
        {input.entries.map((entry) => (
          <div className="formation-effect-card" key={entry.id}>
            <strong>{entry.name}</strong>
            <span>{entry.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FormationScreen() {
  const { save, setCharacterSlot, setFormationElement, setSummonSlot, setWeaponSlot } = useGame();
  const [pickerState, setPickerState] = useState<PickerState>(null);
  const [equipmentPage, setEquipmentPage] = useState<EquipmentPage>('weapon');

  const allCharacters = initialCharacters.map((character) => applyCharacterProgression(character, save.characterStates[character.id]));
  const allWeapons = initialWeapons.map((weapon) => applyWeaponProgression(weapon, save.weaponStates[weapon.id]));
  const allSummons = initialSummons.map((summon) => applySummonProgression(summon, save.summonStates[summon.id]));

  const characters = save.formation.characterIds
    .map((id) => allCharacters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character));
  const equippedWeaponIds = save.formation.weaponIds.filter((id): id is string => Boolean(id));
  const equippedSummonIds = save.formation.summonIds.filter((id): id is string => Boolean(id));
  const weapons = equippedWeaponIds
    .map((id) => allWeapons.find((weapon) => weapon.id === id))
    .filter((weapon): weapon is Weapon => Boolean(weapon));
  const summons = equippedSummonIds
    .map((id) => allSummons.find((summon) => summon.id === id))
    .filter((summon): summon is Summon => Boolean(summon));

  const weaponGrid = createWeaponGrid(save.formation.weaponIds);
  const summonGrid = createSummonGrid(save.formation.summonIds);
  const weaponMainSlot = weaponGrid.slots[0];
  const weaponSubSlots = weaponGrid.slots.slice(1);
  const summonMainSlot = summonGrid.slots[0];
  const summonSubSlots = summonGrid.slots.slice(1);
  const previewSummary = buildPartyPreviewSummary({ characters, weapons, summons });
  const breakdown = previewSummary.attackBreakdown;

  const activeElementLabel = formationTabs.find((tab) => tab.element === save.formation.activeElement)?.label ?? '火';
  const bondSummary = BOND_RULES.map((bond) => {
    const active = bond.isActive(characters);
    const progress = bond.progress(characters);
    return { ...bond, active, progress };
  });

  const closePicker = () => setPickerState(null);

  const equipCharacter = (characterId: string) => {
    if (!pickerState || pickerState.kind !== 'character') return;
    setCharacterSlot(pickerState.slotIndex, characterId);
    closePicker();
  };

  const equipWeapon = (weaponId: string | null) => {
    if (!pickerState || pickerState.kind !== 'weapon') return;
    setWeaponSlot(pickerState.slotIndex, weaponId);
    closePicker();
  };

  const equipSummon = (summonId: string | null) => {
    if (!pickerState || pickerState.kind !== 'summon') return;
    setSummonSlot(pickerState.slotIndex, summonId);
    closePicker();
  };

  const pickerTitle =
    pickerState?.kind === 'character' ? '选择角色' : pickerState?.kind === 'weapon' ? '选择武器' : '选择召唤石';
  const selectedCharacterId = pickerState?.kind === 'character' ? save.formation.characterIds[pickerState.slotIndex] : null;
  const selectedWeaponId = pickerState?.kind === 'weapon' ? save.formation.weaponIds[pickerState.slotIndex] : null;
  const selectedSummonId = pickerState?.kind === 'summon' ? save.formation.summonIds[pickerState.slotIndex] : null;

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">{activeElementLabel}属性队伍</p>
        <h1 id="screen-title">编成</h1>
      </header>

      <section className="panel content-panel">
        <h2>队伍编成</h2>
        <div aria-label="属性编成分页" className="formation-element-tabbar" role="tablist">
          {formationTabs.map((tab) => {
            const selected = save.formation.activeElement === tab.element;
            return (
              <button
                aria-controls={`formation-team-panel-${tab.element}`}
                aria-selected={selected}
                className={selected ? 'formation-element-tab formation-element-tab-active' : 'formation-element-tab'}
                key={tab.element}
                role="tab"
                type="button"
                onClick={() => {
                  closePicker();
                  setFormationElement(tab.element);
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="formation-character-row" id={`formation-team-panel-${save.formation.activeElement}`} role="tabpanel">
          {save.formation.characterIds.map((characterId, slotIndex) =>
            renderCharacterSlot({
              character: allCharacters.find((candidate) => candidate.id === characterId),
              slotIndex,
              levelText: characterLevelText(characterId, save.characterStates),
              onClick: () => setPickerState({ kind: 'character', slotIndex }),
            }),
          )}
        </div>
        <div className="formation-bond-summary" data-testid="formation-bond-summary">
          {bondSummary.map((bond) => (
            <div className={bond.active ? 'formation-bond-card formation-bond-card-active' : 'formation-bond-card'} key={bond.id}>
              <strong>{bond.name}</strong>
              <span>{bond.active ? `已触发 ${bond.description}` : `${bond.progress.current}/${bond.progress.target} ${bond.progress.missingText}`}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel content-panel">
        <h2>武器与召唤</h2>
        <div aria-label="武器召唤分页" className="formation-equipment-pagebar">
          <button
            aria-pressed={equipmentPage === 'weapon'}
            className={equipmentPage === 'weapon' ? 'formation-equipment-page formation-equipment-page-active' : 'formation-equipment-page'}
            data-testid="formation-equipment-page-weapon"
            type="button"
            onClick={() => setEquipmentPage('weapon')}
          >
            武器
          </button>
          <button
            aria-pressed={equipmentPage === 'summon'}
            className={equipmentPage === 'summon' ? 'formation-equipment-page formation-equipment-page-active' : 'formation-equipment-page'}
            data-testid="formation-equipment-page-summon"
            type="button"
            onClick={() => setEquipmentPage('summon')}
          >
            召唤
          </button>
        </div>

        {equipmentPage === 'weapon' ? (
          <div className="formation-block" data-testid="formation-equipment-panel-weapon">
            <div className="grid-title">
              <span>武器盘</span>
            </div>
            <div className="formation-layout">
              <div className="formation-main-slot" data-testid="weapon-main-slot">
                {weaponMainSlot
                  ? renderSlot({
                      slot: weaponMainSlot,
                      kind: 'weapon',
                      levelText: weaponLevelText(weaponMainSlot.itemId, save.weaponStates),
                      testId: 'weapon-grid-slot',
                      triggerTestId: 'weapon-main-slot-trigger',
                      extraClassName: 'equipment-main-slot',
                      onClick: () => setPickerState({ kind: 'weapon', slotIndex: 0 }),
                    })
                  : null}
              </div>
              <div className="equipment-grid equipment-sub-grid weapon-sub-grid" data-testid="weapon-sub-grid">
                {weaponSubSlots.map((slot) =>
                  renderSlot({
                    slot,
                    kind: 'weapon',
                    levelText: weaponLevelText(slot.itemId, save.weaponStates),
                    testId: 'weapon-grid-slot',
                    triggerTestId: `weapon-slot-trigger-${slot.index}`,
                    onClick: () => setPickerState({ kind: 'weapon', slotIndex: slot.index }),
                  }),
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="formation-block" data-testid="formation-equipment-panel-summon">
            <div className="grid-title">
              <span>召唤石</span>
            </div>
            <div className="formation-layout">
              <div className="formation-main-slot" data-testid="summon-main-slot">
                {summonMainSlot
                  ? renderSlot({
                      slot: summonMainSlot,
                      kind: 'summon',
                      levelText: summonLevelText(summonMainSlot.itemId, save.summonStates),
                      testId: 'summon-grid-slot',
                      triggerTestId: 'summon-main-slot-trigger',
                      extraClassName: 'equipment-main-slot',
                      onClick: () => setPickerState({ kind: 'summon', slotIndex: 0 }),
                    })
                  : null}
              </div>
              <div className="equipment-grid equipment-sub-grid summon-sub-grid" data-testid="summon-sub-grid">
                {summonSubSlots.map((slot) =>
                  renderSlot({
                    slot,
                    kind: 'summon',
                    levelText: summonLevelText(slot.itemId, save.summonStates),
                    testId: 'summon-grid-slot',
                    triggerTestId: `summon-slot-trigger-${slot.index}`,
                    onClick: () => setPickerState({ kind: 'summon', slotIndex: slot.index }),
                  }),
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="panel content-panel">
        <h2>数值预览</h2>
        <StatBreakdown
          className="stat-breakdown-preview"
          rows={[
            { label: '星印攻刃', value: percent(breakdown.sections.normal) },
            { label: '方阵攻刃', value: percent(breakdown.sections.magna) },
            { label: 'EX攻刃', value: percent(breakdown.sections.ex) },
            { label: '属性克制', value: percent(breakdown.sections.elemental) },
            { label: '总攻', value: previewSummary.totalAtk },
            { label: '总防', value: previewSummary.totalDefense },
            { label: '总HP', value: previewSummary.totalHp },
            { label: '星印加护', value: percent(previewSummary.normalBoost) },
            { label: '方阵加护', value: percent(previewSummary.magnaBoost) },
            { label: '奥义获得', value: percent(previewSummary.chargeGainModifier) },
            { label: 'DA', value: percent(previewSummary.doubleAttackRate) },
            { label: 'TA', value: percent(previewSummary.tripleAttackRate) },
            { label: '掉落', value: percent(previewSummary.dropRate) },
            { label: '扫荡耗时', value: percent(previewSummary.sweepEfficiency) },
          ]}
        />
      </section>

      <section className="panel content-panel" data-testid="formation-effect-overview">
        <h2>生效效果</h2>
        <div className="formation-effect-groups">
          {previewSummary.effectGroups.map((group) => renderEffectGroup(group))}
        </div>
        <div className="formation-cap-summary" data-testid="formation-cap-summary">
          <h3>效果上限</h3>
          <div className="formation-cap-grid">
            {previewSummary.effectCaps.map((cap) => (
              <div className="formation-cap-card" key={cap.id}>
                <strong>{cap.label}</strong>
                <span>{cap.valueText}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {pickerState ? (
        <div className="slot-picker-backdrop" data-testid={`${pickerState.kind}-slot-picker`} onClick={closePicker}>
          <div
            aria-labelledby="slot-picker-title"
            aria-modal="true"
            className="slot-picker-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="slot-picker-header">
              <div>
                <p className="slot-picker-kicker" />
                <h3 id="slot-picker-title">{pickerTitle}</h3>
              </div>
              <button className="secondary-button slot-picker-close" type="button" onClick={closePicker}>
                关闭
              </button>
            </div>

            <div className="slot-picker-list">
              {pickerState.kind === 'character' ? (
                <>
                  {save.inventory.characterIds.map((characterId) => {
                    const character = allCharacters.find((candidate) => candidate.id === characterId);
                    const selected = selectedCharacterId === characterId;

                    return (
                      <button
                        aria-label={character?.name ?? characterId}
                        className={selected ? 'list-item picker-item picker-item-selected' : 'list-item picker-item'}
                        data-testid={`character-picker-option-${characterId}`}
                        key={characterId}
                        type="button"
                        onClick={() => equipCharacter(characterId)}
                      >
                        <IconBadge label={character?.name ?? characterId} />
                        <div className="picker-copy">
                          <strong>{character?.name ?? characterId}</strong>
                          <span>{character?.rarity ?? 'SSR'} / {characterLevelText(characterId, save.characterStates)}</span>
                          <small>{character?.passives[0]?.name ?? '无被动'} / {character?.passives[1]?.name ?? '无被动'}</small>
                          <small className="picker-tags">{getCharacterTags(character).join(' / ') || '无羁绊标签'}</small>
                        </div>
                      </button>
                    );
                  })}
                </>
              ) : null}

              {pickerState.kind === 'weapon' ? (
                <>
                  <button
                    className={selectedWeaponId === null ? 'list-item picker-item picker-item-selected' : 'list-item picker-item'}
                    type="button"
                    onClick={() => equipWeapon(null)}
                  >
                    <span aria-hidden="true" className="icon-badge">+</span>
                    <div className="picker-copy">
                      <strong>空槽</strong>
                      <span>移除当前武器</span>
                      <small className="picker-effect">不会提供词条效果</small>
                    </div>
                  </button>
                  {save.inventory.weaponIds.map((weaponId) => {
                    const weapon = allWeapons.find((candidate) => candidate.id === weaponId);
                    const selected = selectedWeaponId === weaponId;

                    return (
                      <button
                        aria-label={weapon?.name ?? weaponId}
                        className={selected ? 'list-item picker-item picker-item-selected' : 'list-item picker-item'}
                        data-testid={`weapon-picker-option-${weaponId}`}
                        key={weaponId}
                        type="button"
                        onClick={() => equipWeapon(weaponId)}
                      >
                        <IconBadge label={weapon?.name ?? weaponId} />
                        <div className="picker-copy">
                          <strong>{weapon?.name ?? weaponId}</strong>
                          <span>{weaponLevelText(weaponId, save.weaponStates)}</span>
                          <small className="picker-effect">{weaponEffectText(weapon)}</small>
                        </div>
                      </button>
                    );
                  })}
                </>
              ) : null}

              {pickerState.kind === 'summon' ? (
                <>
                  <button
                    className={selectedSummonId === null ? 'list-item picker-item picker-item-selected' : 'list-item picker-item'}
                    type="button"
                    onClick={() => equipSummon(null)}
                  >
                    <span aria-hidden="true" className="icon-badge">+</span>
                    <div className="picker-copy">
                      <strong>空槽</strong>
                      <span>移除当前召唤石</span>
                      <small className="picker-effect">不会提供加护效果</small>
                    </div>
                  </button>
                  {save.inventory.summonIds.map((summonId) => {
                    const summon = allSummons.find((candidate) => candidate.id === summonId);
                    const selected = selectedSummonId === summonId;

                    return (
                      <button
                        aria-label={summon?.name ?? summonId}
                        className={selected ? 'list-item picker-item picker-item-selected' : 'list-item picker-item'}
                        data-testid={`summon-picker-option-${summonId}`}
                        key={summonId}
                        type="button"
                        onClick={() => equipSummon(summonId)}
                      >
                        <IconBadge label={summon?.name ?? summonId} />
                        <div className="picker-copy">
                          <strong>{summon?.name ?? summonId}</strong>
                          <span>{summonLevelText(summonId, save.summonStates)}</span>
                          <small>{summon?.aura.label ?? '无加护效果'}</small>
                          <small className="picker-effect">ATK {summon?.stats.atk ?? 0} / HP {summon?.stats.hp ?? 0}</small>
                        </div>
                      </button>
                    );
                  })}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
