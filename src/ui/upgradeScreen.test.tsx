import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameProvider } from '../state/gameStore';
import { UpgradeScreen } from './screens/UpgradeScreen';

describe('upgrade screen', () => {
  beforeEach(() => localStorage.clear());

  it('shows the tabbed upgrade screen and material labels', () => {
    render(
      <GameProvider now={() => 1000}>
        <UpgradeScreen />
      </GameProvider>,
    );

    expect(screen.getByText('武器突破块')).toBeInTheDocument();
    expect(screen.getByText('召唤石突破核')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-grid')).toBeInTheDocument();
  });

  it('opens action modal then skill upgrade modal with target select and preview', async () => {
    localStorage.setItem(
      'idle-gbf-save-v1',
      JSON.stringify({
        version: 2,
        createdAt: 1000,
        updatedAt: 1000,
        progress: { clearedQuestIds: [], unlockedCharacterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'] },
        inventory: {
          characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
          weaponIds: ['weapon-red-rail-saber', 'weapon-furnace-grid-blade'],
          summonIds: ['summon-helios-engine', 'summon-aurora-core'],
          materials: {
            'ember-chip': 0,
            'furnace-core': 0,
            'fire-character-exp': 0,
            'fire-character-uncap': 0,
            'fire-weapon-exp': 0,
            'fire-weapon-skill': 3,
            'fire-weapon-uncap': 0,
            'fire-summon-exp': 0,
            'fire-summon-uncap': 0,
          },
          currencies: { crystal: 0, 'gacha-ticket': 0 },
        },
        characterStates: {
          'char-leya-ember-rail': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'char-caro-furnace': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'char-mira-astral-circuit': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'char-noin-ash-protocol': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
        },
        weaponStates: {
          'weapon-red-rail-saber': { level: 1, exp: 0, uncap: 0, levelCap: 40, skillLevel: 1 },
          'weapon-furnace-grid-blade': { level: 1, exp: 0, uncap: 0, levelCap: 40, skillLevel: 1 },
        },
        summonStates: {
          'summon-helios-engine': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'summon-aurora-core': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
        },
        formation: {
          characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
          weaponIds: ['weapon-red-rail-saber', 'weapon-furnace-grid-blade', null, null, null, null, null, null, null, null],
          summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
        },
        activeRun: null,
      }),
    );

    render(
      <GameProvider now={() => 1000}>
        <UpgradeScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('weapon-card-weapon-red-rail-saber'));
    expect(screen.getByTestId('upgrade-action-modal')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('action-词条升级'));

    expect(screen.getByTestId('upgrade-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('upgrade-target-select')).toHaveTextContent('SLv.2');
    expect(screen.getByText(/SLv\.1 -> SLv\.2/)).toBeInTheDocument();
  });

  it('applies target-based skill upgrades after confirmation', async () => {
    localStorage.setItem(
      'idle-gbf-save-v1',
      JSON.stringify({
        version: 2,
        createdAt: 1000,
        updatedAt: 1000,
        progress: { clearedQuestIds: [], unlockedCharacterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'] },
        inventory: {
          characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
          weaponIds: ['weapon-red-rail-saber', 'weapon-furnace-grid-blade'],
          summonIds: ['summon-helios-engine', 'summon-aurora-core'],
          materials: {
            'ember-chip': 0,
            'furnace-core': 0,
            'fire-character-exp': 0,
            'fire-character-uncap': 0,
            'fire-weapon-exp': 0,
            'fire-weapon-skill': 6,
            'fire-weapon-uncap': 0,
            'fire-summon-exp': 0,
            'fire-summon-uncap': 0,
          },
          currencies: { crystal: 0, 'gacha-ticket': 0 },
        },
        characterStates: {
          'char-leya-ember-rail': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'char-caro-furnace': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'char-mira-astral-circuit': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'char-noin-ash-protocol': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
        },
        weaponStates: {
          'weapon-red-rail-saber': { level: 1, exp: 0, uncap: 0, levelCap: 40, skillLevel: 1 },
          'weapon-furnace-grid-blade': { level: 1, exp: 0, uncap: 0, levelCap: 40, skillLevel: 1 },
        },
        summonStates: {
          'summon-helios-engine': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'summon-aurora-core': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
        },
        formation: {
          characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
          weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
          summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
        },
        activeRun: null,
      }),
    );

    render(
      <GameProvider now={() => 1000}>
        <UpgradeScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('weapon-card-weapon-furnace-grid-blade'));
    await userEvent.click(screen.getByTestId('action-词条升级'));
    await userEvent.click(within(screen.getByTestId('upgrade-target-options')).getByRole('button', { name: 'SLv.4' }));

    expect(screen.getByText(/SLv\.1 -> SLv\.4/)).toBeInTheDocument();
    const dialog = screen.getByTestId('upgrade-confirm-dialog');
    expect(within(dialog).getByText('消耗词条回路片')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '确认' }));

    expect(screen.getByText(/武器词条升级完成/)).toBeInTheDocument();
    expect(screen.getAllByText(/SLv\.4/).length).toBeGreaterThan(0);
  });

  it('shows equipped badge and blocks dismantling equipped weapons', async () => {
    render(
      <GameProvider now={() => 1000}>
        <UpgradeScreen />
      </GameProvider>,
    );

    expect(screen.getAllByText('编成中').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByTestId('weapon-card-weapon-red-rail-saber'));
    await userEvent.click(screen.getByTestId('action-拆解'));
    expect(screen.getByText('编成中的武器不能拆解')).toBeInTheDocument();
  });
});
