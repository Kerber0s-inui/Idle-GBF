import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GameProvider } from '../state/gameStore';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('shows expedition first and switches bottom tabs', async () => {
    render(
      <GameProvider now={() => 1000}>
        <AppShell />
      </GameProvider>,
    );

    expect(screen.getByRole('heading', { name: '远征' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '编成' }));
    expect(screen.getByRole('heading', { name: '编成' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '仓库' }));
    expect(screen.getByRole('heading', { name: '仓库' })).toBeInTheDocument();
  });
});
