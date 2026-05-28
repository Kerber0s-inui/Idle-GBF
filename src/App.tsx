import { GameProvider } from './state/gameStore';
import { AppShell } from './ui/AppShell';

export function App() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}
