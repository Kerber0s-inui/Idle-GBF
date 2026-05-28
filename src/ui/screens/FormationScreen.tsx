import { useState } from 'react';
import { initialCharacters, initialSummons, initialWeapons } from '../../domain/content';
import { calculateAttackBreakdown } from '../../domain/formula';
import { createSummonGrid, createWeaponGrid, type FormationSlot } from '../../domain/formation';
import { applyCharacterProgression, applySummonProgression, applyWeaponProgression, getUnlockedCharacterPassives } from '../../domain/progression';
import type { Character, Modifier, Summon, Weapon } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';
import { StatBreakdown } from '../components/StatBreakdown';

type EquipmentKind = 'weapon' | 'summon';

type PickerState =
  | { kind: 'character'; slotIndex: number }
  | { kind: 'weapon'; slotIndex: number }
  | { kind: 'summon'; slotIndex: number }
  | null;

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function slotLabel(kind: EquipmentKind, slot: FormationSlot) {
  if (slot.role === 'main') return kind === 'weapon' ? '主手' : '主召';
  return `副${slot.index}`;
}

function characterSlotLabel(index: number) {
  return `前排${index + 1}`;
}

function findSlotName(slot: FormationSlot, kind: EquipmentKind) {
  if (!slot.itemId) return '空';
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
  if (!weapon) return '无技能效果';
  return weapon.skills.flatMap((skill) => skill.modifiers.map((modifier) => modifier.label)).join(' / ');
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
        <span>{slotLabel(kind, slot)}</span>
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
    <button className="list-item character-slot-button" data-testid={`character-slot-trigger-${slotIndex}`} type="button" onClick={onClick}>
      <IconBadge label={name} />
      <div>
        <span>{characterSlotLabel(slotIndex)}</span>
        <strong>{name}</strong>
        <span>{character?.rarity ?? 'SSR'} {levelText}</span>
      </div>
    </button>
  );
}

export function FormationScreen() {
  const { save, setCharacterSlot, setSummonSlot, setWeaponSlot } = useGame();
  const [pickerState, setPickerState] = useState<PickerState>(null);
  const allCharacters = initialCharacters.map((character) => applyCharacterProgression(character, save.characterStates[character.id]));
  const allWeapons = initialWeapons.map((weapon) => applyWeaponProgression(weapon, save.weaponStates[weapon.id]));
  const allSummons = initialSummons.map((summon) => applySummonProgression(summon, save.summonStates[summon.id]));
  const characters = save.formation.characterIds
    .map((id) => allCharacters.find((character) => character.id === id))
    .filter(Boolean);
  const equippedWeaponIds = save.formation.weaponIds.filter((id): id is string => Boolean(id));
  const equippedSummonIds = save.formation.summonIds.filter((id): id is string => Boolean(id));
  const weapons = equippedWeaponIds
    .map((id) => allWeapons.find((weapon) => weapon.id === id))
    .filter(Boolean);
  const summons = equippedSummonIds
    .map((id) => allSummons.find((summon) => summon.id === id))
    .filter(Boolean);
  const weaponGrid = createWeaponGrid(save.formation.weaponIds);
  const summonGrid = createSummonGrid(save.formation.summonIds);
  const weaponMainSlot = weaponGrid.slots[0];
  const weaponSubSlots = weaponGrid.slots.slice(1);
  const summonMainSlot = summonGrid.slots[0];
  const summonSubSlots = summonGrid.slots.slice(1);
  const modifiers = weapons.flatMap((weapon) => weapon?.skills.flatMap((skill) => skill.modifiers) ?? []) as Modifier[];
  const magnaBoost = summons
    .filter((summon) => summon?.aura.target === 'magna')
    .reduce((total, summon) => total + (summon?.aura.boost ?? 0), 0);
  const normalBoost = summons
    .filter((summon) => summon?.aura.target === 'normal')
    .reduce((total, summon) => total + (summon?.aura.boost ?? 0), 0);
  const elementalAttack = summons
    .filter((summon) => summon?.aura.target === 'elemental')
    .reduce((total, summon) => total + (summon?.aura.boost ?? 0), 0);
  const breakdown = calculateAttackBreakdown({
    baseAttack: characters.reduce((total, character) => total + (character?.stats.atk ?? 0), 0),
    modifiers: [
      ...modifiers,
      { id: 'ui-elemental', label: '属性攻击', type: 'attack', value: elementalAttack, category: 'elemental', source: 'summon' },
    ],
    magnaBoost,
    normalBoost,
    hpRatio: 1,
    attackKind: 'normalAttack',
  });
  const chargeGain = characters
    .flatMap((character) =>
      character ? getUnlockedCharacterPassives(character, save.characterStates[character.id]).flatMap((passive) => passive.modifiers) : [],
    )
    .filter((modifier) => modifier.type === 'chargeGain' || modifier.type === 'doubleAttackRate').length;

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
  const activeSlotLabel =
    pickerState?.kind === 'character'
      ? characterSlotLabel(pickerState.slotIndex)
      : pickerState?.kind === 'weapon'
        ? slotLabel('weapon', weaponGrid.slots[pickerState.slotIndex] ?? weaponMainSlot)
        : pickerState?.kind === 'summon'
          ? slotLabel('summon', summonGrid.slots[pickerState.slotIndex] ?? summonMainSlot)
          : '';
  const selectedCharacterId = pickerState?.kind === 'character' ? save.formation.characterIds[pickerState.slotIndex] : null;
  const selectedWeaponId = pickerState?.kind === 'weapon' ? save.formation.weaponIds[pickerState.slotIndex] : null;
  const selectedSummonId = pickerState?.kind === 'summon' ? save.formation.summonIds[pickerState.slotIndex] : null;

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">火队</p>
        <h1 id="screen-title">编成</h1>
      </header>

      <section className="panel content-panel">
        <h2>队伍编成</h2>
        <div className="row-list">
          {save.formation.characterIds.map((characterId, slotIndex) =>
            renderCharacterSlot({
              character: allCharacters.find((candidate) => candidate.id === characterId),
              slotIndex,
              levelText: characterLevelText(characterId, save.characterStates),
              onClick: () => setPickerState({ kind: 'character', slotIndex }),
            }),
          )}
        </div>
      </section>

      <section className="panel content-panel">
        <h2>武器与召唤</h2>

        <div className="formation-block">
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

        <div className="formation-block">
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
      </section>

      <section className="panel content-panel">
        <h2>伤害拆解</h2>
        <StatBreakdown
          rows={[
            { label: '通常攻刃', value: percent(breakdown.sections.normal) },
            { label: '方阵攻刃', value: percent(breakdown.sections.magna) },
            { label: 'EX 攻刃', value: percent(breakdown.sections.ex) },
            { label: '属性攻击', value: percent(breakdown.sections.elemental) },
            { label: '连击/奥义槽', value: chargeGain > 0 ? `${chargeGain} 条来源` : '无额外来源' },
          ]}
        />
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
                <p className="slot-picker-kicker">{activeSlotLabel}</p>
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
                      <small className="picker-effect">不会提供技能效果</small>
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
                          <small>{(summon as Summon | undefined)?.aura.label ?? '无加护效果'}</small>
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
