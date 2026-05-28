import { useState } from 'react';
import { initialCharacters, initialSummons, initialWeapons } from '../../domain/content';
import { useGame } from '../../state/gameStore';
import { IconBadge } from '../components/IconBadge';

function materialCount(materials: Record<string, number>, itemId: string) {
  return materials[itemId] ?? 0;
}

export function UpgradeScreen() {
  const {
    save,
    uncapCharacter,
    uncapSummon,
    uncapWeapon,
    upgradeCharacter,
    upgradeSummon,
    upgradeWeapon,
    upgradeWeaponSkill,
  } = useGame();
  const [message, setMessage] = useState('');
  const materials = save.inventory.materials;
  const characters = save.inventory.characterIds
    .map((id) => initialCharacters.find((character) => character.id === id))
    .filter(Boolean);
  const weapons = save.inventory.weaponIds.map((id) => initialWeapons.find((weapon) => weapon.id === id)).filter(Boolean);
  const summons = save.inventory.summonIds.map((id) => initialSummons.find((summon) => summon.id === id)).filter(Boolean);

  const runAction = (action: () => void, success: string) => {
    try {
      action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '强化失败');
    }
  };

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">成长</p>
        <h1 id="screen-title">强化</h1>
      </header>

      <div className="panel">
        <div className="stat-row">
          <span>角色经验端子</span>
          <strong>{materialCount(materials, 'fire-character-exp')}</strong>
        </div>
        <div className="stat-row">
          <span>角色突破核</span>
          <strong>{materialCount(materials, 'fire-character-uncap')}</strong>
        </div>
        <div className="stat-row">
          <span>武器经验合金</span>
          <strong>{materialCount(materials, 'fire-weapon-exp')}</strong>
        </div>
        <div className="stat-row">
          <span>词条回路片</span>
          <strong>{materialCount(materials, 'fire-weapon-skill')}</strong>
        </div>
        <div className="stat-row">
          <span>召唤石经验晶</span>
          <strong>{materialCount(materials, 'fire-summon-exp')}</strong>
        </div>
      </div>

      <section className="panel content-panel">
        <h2>角色</h2>
        <div className="row-list">
          {characters.map((character) => {
            const state = save.characterStates[character?.id ?? ''];

            return (
              <div className="list-item split-item" key={character?.id}>
                <IconBadge label={character?.name ?? ''} />
                <div>
                  <strong>{character?.name}</strong>
                  <span>
                    Lv.{state?.level ?? character?.level}/{state?.levelCap ?? character?.maxLevel} / 突破 {state?.uncap ?? 0}
                  </span>
                </div>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    disabled={materialCount(materials, 'fire-character-exp') < 1}
                    type="button"
                    onClick={() => runAction(() => upgradeCharacter(character?.id ?? ''), '角色升级完成')}
                  >
                    升级角色
                  </button>
                  <button
                    className="secondary-button"
                    disabled={materialCount(materials, 'fire-character-uncap') < 1}
                    type="button"
                    onClick={() => runAction(() => uncapCharacter(character?.id ?? ''), '角色突破完成')}
                  >
                    突破
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel content-panel">
        <h2>武器</h2>
        <div className="row-list">
          {weapons.map((weapon) => {
            const state = save.weaponStates[weapon?.id ?? ''];

            return (
              <div className="list-item split-item" key={weapon?.id}>
                <IconBadge label={weapon?.name ?? ''} />
                <div>
                  <strong>{weapon?.name}</strong>
                  <span>
                    Lv.{state?.level ?? weapon?.level}/{state?.levelCap ?? weapon?.maxLevel} / 词条 Lv.{state?.skillLevel ?? 1}
                  </span>
                </div>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    disabled={materialCount(materials, 'fire-weapon-exp') < 1}
                    type="button"
                    onClick={() => runAction(() => upgradeWeapon(weapon?.id ?? ''), '武器升级完成')}
                  >
                    升级
                  </button>
                  <button
                    className="secondary-button"
                    disabled={materialCount(materials, 'fire-weapon-skill') < 1}
                    type="button"
                    onClick={() => runAction(() => upgradeWeaponSkill(weapon?.id ?? ''), '词条升级完成')}
                  >
                    词条
                  </button>
                  <button
                    className="secondary-button"
                    disabled={materialCount(materials, 'fire-weapon-uncap') < 1}
                    type="button"
                    onClick={() => runAction(() => uncapWeapon(weapon?.id ?? ''), '武器突破完成')}
                  >
                    突破
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel content-panel">
        <h2>召唤石</h2>
        <div className="row-list">
          {summons.map((summon) => {
            const state = save.summonStates[summon?.id ?? ''];

            return (
              <div className="list-item split-item" key={summon?.id}>
                <IconBadge label={summon?.name ?? ''} />
                <div>
                  <strong>{summon?.name}</strong>
                  <span>
                    Lv.{state?.level ?? summon?.level}/{state?.levelCap ?? summon?.maxLevel} / 突破 {state?.uncap ?? 0}
                  </span>
                </div>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    disabled={materialCount(materials, 'fire-summon-exp') < 1}
                    type="button"
                    onClick={() => runAction(() => upgradeSummon(summon?.id ?? ''), '召唤石升级完成')}
                  >
                    升级
                  </button>
                  <button
                    className="secondary-button"
                    disabled={materialCount(materials, 'fire-summon-uncap') < 1}
                    type="button"
                    onClick={() => runAction(() => uncapSummon(summon?.id ?? ''), '召唤石突破完成')}
                  >
                    突破
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {message ? <p className="status-text">{message}</p> : null}
    </>
  );
}
