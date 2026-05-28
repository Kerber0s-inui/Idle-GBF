import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialSave } from '../domain/save';
import { GameProvider, storageKey } from '../state/gameStore';
import { ExpeditionScreen } from './screens/ExpeditionScreen';

function seedSave(clearedQuestIds: string[] = []) {
  const save = createInitialSave(1000);
  save.progress.clearedQuestIds = clearedQuestIds;
  localStorage.setItem(storageKey, JSON.stringify(save));
}

describe('expedition screen', () => {
  beforeEach(() => localStorage.clear());

  it('shows top tabs and filters quests by category', async () => {
    render(
      <GameProvider now={() => 1000}>
        <ExpeditionScreen />
      </GameProvider>,
    );

    expect(screen.getByRole('tab', { name: '主线' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'BOSS' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '素材' })).toBeInTheDocument();

    expect(screen.getByTestId('expedition-quest-quest-main-1')).toBeInTheDocument();
    expect(screen.queryByTestId('expedition-quest-quest-boss-wind-1')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'BOSS' }));
    expect(screen.getByTestId('expedition-quest-quest-boss-wind-1')).toBeInTheDocument();
    expect(screen.queryByTestId('expedition-quest-quest-main-1')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: '素材' }));
    expect(screen.getByTestId('expedition-quest-quest-material-wind-1')).toBeInTheDocument();
    expect(screen.queryByTestId('expedition-quest-quest-boss-wind-1')).not.toBeInTheDocument();
  });

  it('keeps main quests manual only and marks cleared main quests as passed', () => {
    seedSave(['quest-main-1', 'quest-main-2']);

    render(
      <GameProvider now={() => 1000}>
        <ExpeditionScreen />
      </GameProvider>,
    );

    expect(screen.getByRole('button', { name: '开始' })).toBeInTheDocument();
    expect(screen.queryByText('回数')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提前结算' })).not.toBeInTheDocument();
    expect(screen.getByTestId('expedition-quest-quest-main-1')).toHaveTextContent('已通过');
  });

  it('shows sweep controls for cleared non-main quests and supports plus minus and input', async () => {
    seedSave(['quest-main-1', 'quest-boss-wind-1']);

    render(
      <GameProvider now={() => 1000}>
        <ExpeditionScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getByRole('tab', { name: 'BOSS' }));
    await userEvent.click(screen.getByTestId('expedition-quest-quest-boss-wind-1'));
    await userEvent.click(screen.getByRole('button', { name: '查看' }));

    const minusButton = screen.getByRole('button', { name: '减少回数' });
    const plusButton = screen.getByRole('button', { name: '增加回数' });
    const input = screen.getByLabelText('回数输入');
    const countValue = screen.getByTestId('expedition-sweep-count');

    expect(screen.getByRole('button', { name: '提前结算' })).toBeInTheDocument();
    expect(countValue).toHaveTextContent('10');

    await userEvent.click(plusButton);
    expect(countValue).toHaveTextContent('11');

    await userEvent.click(minusButton);
    await userEvent.clear(input);
    await userEvent.type(input, '23');
    expect(countValue).toHaveTextContent('23');
  });

  it('opens a drop modal only for available quests and uses a separate view button', async () => {
    render(
      <GameProvider now={() => 1000}>
        <ExpeditionScreen />
      </GameProvider>,
    );

    await userEvent.click(screen.getAllByRole('button', { name: '查看' })[0]);
    expect(screen.getByRole('dialog', { name: '副本掉落' })).toBeInTheDocument();
    expect(screen.getByText('掉落预览')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '关闭' }));
    await userEvent.click(screen.getByRole('tab', { name: 'BOSS' }));
    expect(screen.getByTestId('expedition-quest-quest-boss-wind-1')).toBeDisabled();
  });
});
