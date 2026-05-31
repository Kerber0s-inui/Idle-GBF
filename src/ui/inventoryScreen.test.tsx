import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialCharacters, initialSummons, initialWeapons } from '../domain/content';
import { GameProvider } from '../state/gameStore';
import { InventoryScreen } from './screens/InventoryScreen';

describe('inventory screen', () => {
  beforeEach(() => localStorage.clear());

  it('renders fixed three-row resource and codex sections with paging controls', () => {
    render(
      <GameProvider now={() => 1000}>
        <InventoryScreen />
      </GameProvider>,
    );

    expect(screen.getByRole('heading', { name: '仓库' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '图鉴' })).toBeInTheDocument();
    expect(screen.getByTestId('inventory-resource-grid')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-resource-page-indicator')).toHaveTextContent('1 / 2');
    expect(screen.getByTestId('inventory-collection-page-indicator')).toHaveTextContent('1 / 1');
    expect(screen.getByRole('tab', { name: /角色图鉴/ })).toBeInTheDocument();
  });

  it('shows resource cards with icon plus name and quantity and pages after three rows', async () => {
    render(
      <GameProvider now={() => 1000}>
        <InventoryScreen />
      </GameProvider>,
    );

    const resourceGrid = screen.getByTestId('inventory-resource-grid');
    expect(within(resourceGrid).getAllByTestId(/inventory-resource-card-/)).toHaveLength(9);
    expect(screen.getByTestId('inventory-resource-card-crystal')).toHaveTextContent('宝晶石');
    expect(screen.getByTestId('inventory-resource-card-crystal')).toHaveTextContent('0');
    expect(within(screen.getByTestId('inventory-resource-card-crystal')).getByTestId('inventory-resource-icon-crystal')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('inventory-resource-next'));
    expect(screen.getByTestId('inventory-resource-page-indicator')).toHaveTextContent('2 / 2');
    expect(screen.getByTestId('inventory-resource-card-fire-summon-uncap')).toBeInTheDocument();
  });

  it('shows square codex entries and pages through locked placeholders', async () => {
    localStorage.setItem(
      'idle-gbf-save-v1',
      JSON.stringify({
        version: 2,
        createdAt: 1000,
        updatedAt: 1000,
        progress: { clearedQuestIds: [], unlockedCharacterIds: ['char-leya-ember-rail'] },
        inventory: {
          characterIds: ['char-leya-ember-rail'],
          weaponIds: ['weapon-red-rail-saber'],
          summonIds: ['summon-helios-engine'],
          materials: {
            'ember-chip': 3,
            'furnace-core': 4,
            'fire-character-exp': 5,
            'fire-character-uncap': 1,
            'fire-weapon-exp': 6,
            'fire-weapon-skill': 2,
            'fire-weapon-uncap': 1,
            'fire-summon-exp': 7,
            'fire-summon-uncap': 1,
          },
          currencies: { crystal: 10, 'gacha-ticket': 1 },
        },
        characterStates: {
          'char-leya-ember-rail': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
        },
        weaponStates: {
          'weapon-red-rail-saber': { level: 1, exp: 0, uncap: 0, levelCap: 40, skillLevel: 1 },
        },
        summonStates: {
          'summon-helios-engine': { level: 1, exp: 0, uncap: 0, levelCap: 40 },
        },
        formation: {
          characterIds: ['char-leya-ember-rail', 'char-leya-ember-rail', 'char-leya-ember-rail', 'char-leya-ember-rail'],
          weaponIds: ['weapon-red-rail-saber', null, null, null, null, null, null, null, null, null],
          summonIds: ['summon-helios-engine', null, null, null, null],
        },
        activeRun: null,
      }),
    );

    render(
      <GameProvider now={() => 1000}>
        <InventoryScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByRole('tab', { name: /武器图鉴/ }));

    const grid = screen.getByTestId('inventory-collection-grid');
    expect(within(grid).getAllByTestId(/inventory-collection-grid-cell-/)).toHaveLength(16);
    expect(screen.getByTestId('inventory-collection-card-weapon-red-rail-saber')).not.toHaveClass('inventory-collection-card-locked');
    expect(screen.getByTestId('inventory-collection-card-weapon-furnace-grid-blade')).toHaveClass('inventory-collection-card-locked');
    expect(screen.getByTestId('inventory-collection-card-weapon-furnace-grid-blade')).toHaveTextContent('未获得');
    expect(screen.getByTestId('inventory-collection-card-weapon-furnace-grid-blade')).toHaveTextContent('???');
  });

  it('keeps all known entries addressable through category tabs', async () => {
    render(
      <GameProvider now={() => 1000}>
        <InventoryScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByRole('tab', { name: /角色图鉴/ }));
    expect(screen.getAllByTestId(/inventory-collection-card-char-/)).toHaveLength(initialCharacters.length);

    await userEvent.click(screen.getByRole('tab', { name: /武器图鉴/ }));
    expect(screen.getAllByTestId(/inventory-collection-card-weapon-/)).toHaveLength(initialWeapons.length);

    await userEvent.click(screen.getByRole('tab', { name: /召唤石图鉴/ }));
    expect(screen.getAllByTestId(/inventory-collection-card-summon-/)).toHaveLength(initialSummons.length);
  });
});
