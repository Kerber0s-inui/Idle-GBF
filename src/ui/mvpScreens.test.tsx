import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameProvider } from '../state/gameStore';
import { FormationScreen } from './screens/FormationScreen';

describe('formation screen', () => {
  beforeEach(() => localStorage.clear());

  it('renders team formation plus dedicated weapon and summon regions', () => {
    render(
      <GameProvider now={() => 1000}>
        <FormationScreen />
      </GameProvider>,
    );

    expect(screen.getByRole('heading', { name: '队伍编成' })).toBeInTheDocument();
    expect(screen.getByTestId('character-slot-trigger-0')).toHaveTextContent('前排1');
    expect(screen.getAllByTestId('weapon-grid-slot')).toHaveLength(10);
    expect(screen.getAllByTestId('summon-grid-slot')).toHaveLength(5);
    expect(screen.getByTestId('weapon-main-slot')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-sub-grid')).toBeInTheDocument();
    expect(screen.getByTestId('summon-main-slot')).toBeInTheDocument();
    expect(screen.getByTestId('summon-sub-grid')).toBeInTheDocument();
  });

  it('opens modal pickers and shows compact equipment details', async () => {
    render(
      <GameProvider now={() => 1000}>
        <FormationScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('weapon-main-slot-trigger'));
    const weaponPicker = screen.getByTestId('weapon-slot-picker');
    expect(within(weaponPicker).getByRole('dialog')).toBeInTheDocument();
    const furnaceOption = within(weaponPicker).getByTestId('weapon-picker-option-weapon-furnace-grid-blade');
    expect(within(furnaceOption).getByText(/Lv\.1 \/ SLv\.1/)).toBeInTheDocument();
    expect(within(furnaceOption).getByText(/方阵攻刃 \+7%/)).toBeInTheDocument();
    await userEvent.click(furnaceOption);
    expect(screen.getByTestId('weapon-main-slot')).toHaveTextContent('第七炉心刃');

    await userEvent.click(screen.getByTestId('summon-main-slot-trigger'));
    const summonPicker = screen.getByTestId('summon-slot-picker');
    expect(within(summonPicker).getByRole('dialog')).toBeInTheDocument();
    expect(within(summonPicker).getByText(/ATK 880 \/ HP 420/)).toBeInTheDocument();
    await userEvent.click(within(summonPicker).getByTestId('summon-picker-option-summon-aurora-core'));
    expect(screen.getByTestId('summon-main-slot')).toHaveTextContent('赤曦炉核');
  });

  it('swaps slots when selecting equipment that is already equipped elsewhere', async () => {
    render(
      <GameProvider now={() => 1000}>
        <FormationScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('weapon-main-slot-trigger'));
    const weaponPicker = screen.getByTestId('weapon-slot-picker');
    await userEvent.click(within(weaponPicker).getByTestId('weapon-picker-option-weapon-furnace-grid-blade'));

    expect(screen.getByTestId('weapon-main-slot')).toHaveTextContent('第七炉心刃');
    expect(screen.getByTestId('weapon-slot-trigger-1')).toHaveTextContent('赤轨誓剑');
  });

  it('swaps team members from a floating picker', async () => {
    render(
      <GameProvider now={() => 1000}>
        <FormationScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('character-slot-trigger-0'));
    const characterPicker = screen.getByTestId('character-slot-picker');
    expect(within(characterPicker).getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(within(characterPicker).getByTestId('character-picker-option-char-noin-ash-protocol'));

    expect(screen.getByTestId('character-slot-trigger-0')).toHaveTextContent('诺因·灰烬协议');
    expect(screen.getByTestId('character-slot-trigger-3')).toHaveTextContent('莱娅·赤轨');
  });

  it('equips into the clicked sub slot instead of always replacing the main slot', async () => {
    render(
      <GameProvider now={() => 1000}>
        <FormationScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByTestId('weapon-slot-trigger-2'));
    const weaponPicker = screen.getByTestId('weapon-slot-picker');
    await userEvent.click(within(weaponPicker).getByTestId('weapon-picker-option-weapon-furnace-grid-blade'));

    expect(screen.getByTestId('weapon-main-slot')).toHaveTextContent('赤轨誓剑');
    expect(screen.getByTestId('weapon-slot-trigger-2')).toHaveTextContent('第七炉心刃');
  });
});
