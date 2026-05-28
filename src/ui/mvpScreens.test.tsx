import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GameProvider } from '../state/gameStore';
import { AppShell } from './AppShell';

describe('mvp screens', () => {
  it('shows first clear, sweep setup, formation breakdown, gacha and save tools', async () => {
    render(
      <GameProvider now={() => 1000}>
        <AppShell />
      </GameProvider>,
    );

    expect(screen.getByRole('button', { name: '开始首通' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '编成' }));
    expect(screen.getByText('通常攻刃')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '抽卡' }));
    expect(screen.getByRole('button', { name: '单抽' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '仓库' }));
    expect(screen.getByRole('button', { name: '导出存档' })).toBeInTheDocument();
  });

  it('keeps the cleared quest selected so sweep is immediately available', async () => {
    render(
      <GameProvider now={() => 1000}>
        <AppShell />
      </GameProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '开始首通' }));

    expect(screen.getByRole('button', { name: '开始扫荡' })).toBeInTheDocument();
  });

});
