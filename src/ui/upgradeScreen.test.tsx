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
    const weaponCard = screen.getByTestId('weapon-card-weapon-red-rail-saber');
    expect(weaponCard).toHaveTextContent(/Lv\.1\/40\s+SLv\.1/);
    expect(within(weaponCard).getAllByText(/\+8%/).length).toBeGreaterThan(0);
    expect(within(weaponCard).queryByText(/SLv\.1 \/ /)).not.toBeInTheDocument();
    expect(within(weaponCard).queryByText('突破 0')).not.toBeInTheDocument();
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
    expect(screen.queryByText(/SLv\.1 -> SLv\.2/)).not.toBeInTheDocument();
    expect(screen.getByText(/星印攻刃 \+8% -> 星印攻刃 \+9%/)).toBeInTheDocument();
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

    const dialog = screen.getByTestId('upgrade-confirm-dialog');
    expect(within(dialog).getByText('词条回路片')).toBeInTheDocument();
    expect(within(dialog).getByText(/方阵攻刃 \+7% -> 方阵攻刃 \+10%/)).toBeInTheDocument();

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

  it('shows level cap change instead of stage change in uncap dialogs', async () => {
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
            'fire-character-uncap': 3,
            'fire-weapon-exp': 0,
            'fire-weapon-skill': 0,
            'fire-weapon-uncap': 3,
            'fire-summon-exp': 0,
            'fire-summon-uncap': 3,
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

    await userEvent.click(screen.getByTestId('weapon-card-weapon-red-rail-saber'));
    await userEvent.click(screen.getByTestId('action-突破'));

    const weaponDialog = screen.getByTestId('upgrade-confirm-dialog');
    expect(within(weaponDialog).getByText('等级上限')).toBeInTheDocument();
    expect(within(weaponDialog).getByText(/40 -> 60/)).toBeInTheDocument();
    expect(within(weaponDialog).queryByText(/阶段0 -> 阶段1/)).not.toBeInTheDocument();
  });

  it('renders filled and hollow stars differently after uncapping', () => {
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
            'fire-weapon-skill': 0,
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
          'weapon-red-rail-saber': { level: 1, exp: 0, uncap: 1, levelCap: 60, skillLevel: 1 },
          'weapon-furnace-grid-blade': { level: 1, exp: 0, uncap: 0, levelCap: 40, skillLevel: 1 },
        },
        summonStates: {
          'summon-helios-engine': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
          'summon-aurora-core': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
        },
        formation: {
          activeElement: 'fire',
          characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
          weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
          summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
          teams: {
            fire: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            water: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            earth: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            wind: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            light: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            dark: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
          },
        },
        activeRun: null,
      }),
    );

    render(
      <GameProvider now={() => 1000}>
        <UpgradeScreen />
      </GameProvider>,
    );

    const card = screen.getByTestId('weapon-card-weapon-red-rail-saber');
    const stars = within(card).getByLabelText('突破 1');

    expect(stars).toHaveTextContent('★');
    expect(stars).toHaveTextContent('☆');
  });

  it('syncs summon stars with the same filled and hollow rendering', async () => {
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
            'fire-weapon-skill': 0,
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
          'summon-helios-engine': { level: 1, exp: 0, uncap: 1, levelCap: 60 },
          'summon-aurora-core': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
        },
        formation: {
          activeElement: 'fire',
          characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
          weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
          summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
          teams: {
            fire: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            water: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            earth: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            wind: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            light: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
            dark: {
              characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
              weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
              summonIds: ['summon-helios-engine', 'summon-aurora-core', null, null, null],
            },
          },
        },
        activeRun: null,
      }),
    );

    render(
      <GameProvider now={() => 1000}>
        <UpgradeScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('summon-tab'));

    const card = screen.getByTestId('summon-card-summon-helios-engine');
    const stars = within(card).getByLabelText('突破 1');

    expect(stars).toHaveTextContent('★');
    expect(stars).toHaveTextContent('☆');
  });

  it('shows character cards with stars only for uncap and one extra stat row', async () => {
    render(
      <GameProvider now={() => 1000}>
        <UpgradeScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('character-tab'));

    const card = screen.getByTestId('character-card-char-leya-ember-rail');
    expect(card).toHaveTextContent(/Lv\.1\/40/);
    expect(card).toHaveTextContent(/攻\s+\d+/);
    expect(card).toHaveTextContent(/防\s+\d+/);
    expect(card).toHaveTextContent(/HP\s+\d+/);
    expect(card).toHaveTextContent(/连\s+\d+(\.\d+)?%/);
    expect(within(card).queryByText('突破 0')).not.toBeInTheDocument();
    expect(within(card).getByLabelText('突破 0')).toBeInTheDocument();
  });

  it('uses the same large star size for character, weapon, and summon cards', async () => {
    render(
      <GameProvider now={() => 1000}>
        <UpgradeScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('character-tab'));
    expect(within(screen.getByTestId('character-card-char-leya-ember-rail')).getByLabelText('突破 0').className).toContain('upgrade-stars-large');

    await userEvent.click(screen.getByTestId('weapon-tab'));
    expect(within(screen.getByTestId('weapon-card-weapon-red-rail-saber')).getByLabelText('突破 0').className).toContain('upgrade-stars-large');

    await userEvent.click(screen.getByTestId('summon-tab'));
    expect(within(screen.getByTestId('summon-card-summon-helios-engine')).getByLabelText('突破 0').className).toContain('upgrade-stars-large');
  });

  it('shows weapon and summon white-stat previews in upgrade dialogs', async () => {
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
            'fire-character-exp': 5,
            'fire-character-uncap': 0,
            'fire-weapon-exp': 5,
            'fire-weapon-skill': 0,
            'fire-weapon-uncap': 0,
            'fire-summon-exp': 5,
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
    await userEvent.click(screen.getByTestId('action-升级'));

    const weaponDialog = screen.getByTestId('upgrade-confirm-dialog');
    expect(within(weaponDialog).queryByText(/Lv\.1\s->\sLv\.2/)).not.toBeInTheDocument();
    expect(within(weaponDialog).getByText(/^攻$/)).toBeInTheDocument();
    expect(within(weaponDialog).getByText(/^防$/)).toBeInTheDocument();
    expect(within(weaponDialog).getByText(/^HP$/)).toBeInTheDocument();
    expect(within(weaponDialog).getByText('消耗武器经验合金')).toBeInTheDocument();
    expect(within(weaponDialog).getAllByText(/\d+\s->\s\d+/)).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    await userEvent.click(screen.getByTestId('character-tab'));
    await userEvent.click(screen.getByTestId('character-card-char-leya-ember-rail'));
    await userEvent.click(screen.getByTestId('action-升级'));

    const characterDialog = screen.getByTestId('upgrade-confirm-dialog');
    expect(within(characterDialog).queryByText(/Lv\.1\s->\sLv\.2/)).not.toBeInTheDocument();
    expect(within(characterDialog).getByText(/^攻$/)).toBeInTheDocument();
    expect(within(characterDialog).getByText(/^防$/)).toBeInTheDocument();
    expect(within(characterDialog).getByText(/^HP$/)).toBeInTheDocument();
    expect(within(characterDialog).getByText('消耗角色经验素材')).toBeInTheDocument();
    expect(within(characterDialog).getAllByText(/\d+\s->\s\d+/)).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    await userEvent.click(screen.getByTestId('summon-tab'));
    await userEvent.click(screen.getByTestId('summon-card-summon-helios-engine'));
    await userEvent.click(screen.getByTestId('action-升级'));

    const summonDialog = screen.getByTestId('upgrade-confirm-dialog');
    expect(within(summonDialog).queryByText(/Lv\.1\s->\sLv\.2/)).not.toBeInTheDocument();
    expect(within(summonDialog).getByText(/^攻$/)).toBeInTheDocument();
    expect(within(summonDialog).getByText(/^防$/)).toBeInTheDocument();
    expect(within(summonDialog).getByText(/^HP$/)).toBeInTheDocument();
    expect(within(summonDialog).getByText('消耗召唤经验晶')).toBeInTheDocument();
    expect(within(summonDialog).getAllByText(/\d+\s->\s\d+/)).toHaveLength(3);
  });
});
