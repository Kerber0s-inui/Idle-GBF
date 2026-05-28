import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GameProvider } from '../state/gameStore';
import { createInitialSave, exportSave } from '../domain/save';
import { storageKey } from '../state/gameStore';
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

  it('can sweep the just-cleared quest and then continue the main route', async () => {
    render(
      <GameProvider now={() => 1000}>
        <AppShell />
      </GameProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '开始首通' }));

    expect(screen.getByRole('button', { name: '开始扫荡' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '继续主线' }));
    expect(screen.getByRole('button', { name: '开始首通' })).toBeInTheDocument();
  });

  it('previews upgrades without spending materials', async () => {
    const save = createInitialSave(1000);
    save.inventory.materials['fire-character-exp'] = 1;
    localStorage.setItem(storageKey, exportSave(save));

    render(
      <GameProvider now={() => 1000}>
        <AppShell />
      </GameProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '强化' }));
    await userEvent.click(screen.getAllByRole('button', { name: '升级角色' })[0]);

    expect(screen.getByText(/Lv\.2\/80/)).toBeInTheDocument();
    expect(screen.getByText('角色升级完成')).toBeInTheDocument();
  });

  it('shows freely selectable quest groups and structured first-clear logs', async () => {
    render(
      <GameProvider now={() => 1000}>
        <AppShell />
      </GameProvider>,
    );

    expect(screen.getByRole('heading', { name: '主线副本' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Boss 本' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '材料本' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /主线 1/ }));
    await userEvent.click(screen.getByRole('button', { name: '开始首通' }));

    expect(screen.getAllByText(/造成了 \d+ 伤害/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('展开')[0]).toBeInTheDocument();
  });

  it('renders 1+9 weapon and 1+4 summon grids with empty slots', async () => {
    render(
      <GameProvider now={() => 1000}>
        <AppShell />
      </GameProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '编成' }));

    expect(screen.getAllByTestId('weapon-grid-slot')).toHaveLength(10);
    expect(screen.getAllByTestId('summon-grid-slot')).toHaveLength(5);
    expect(screen.getAllByText('空')).toHaveLength(11);
  });
});
