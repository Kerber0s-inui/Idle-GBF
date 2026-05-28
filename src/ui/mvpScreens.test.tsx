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
    save.inventory.materials['ember-chip'] = 1;
    localStorage.setItem(storageKey, exportSave(save));

    render(
      <GameProvider now={() => 1000}>
        <AppShell />
      </GameProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '强化' }));
    await userEvent.click(screen.getAllByRole('button', { name: '预览强化' })[0]);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('需要余烬碎片 x1，等级成长将在后续版本持久化')).toBeInTheDocument();
  });
});
