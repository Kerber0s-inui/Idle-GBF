import { useState, type ComponentType } from 'react';
import { Boxes, Gem, Map, Shield, Sparkles, type LucideIcon } from 'lucide-react';
import { ExpeditionScreen } from './screens/ExpeditionScreen';
import { FormationScreen } from './screens/FormationScreen';
import { UpgradeScreen } from './screens/UpgradeScreen';
import { GachaScreen } from './screens/GachaScreen';
import { InventoryScreen } from './screens/InventoryScreen';

type TabId = 'expedition' | 'formation' | 'upgrade' | 'gacha' | 'inventory';

type TabDefinition = {
  id: TabId;
  label: string;
  icon: LucideIcon;
  Screen: ComponentType;
};

const tabs: TabDefinition[] = [
  { id: 'expedition', label: '远征', icon: Map, Screen: ExpeditionScreen },
  { id: 'formation', label: '编成', icon: Shield, Screen: FormationScreen },
  { id: 'upgrade', label: '强化', icon: Sparkles, Screen: UpgradeScreen },
  { id: 'gacha', label: '抽卡', icon: Gem, Screen: GachaScreen },
  { id: 'inventory', label: '仓库', icon: Boxes, Screen: InventoryScreen },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('expedition');
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ActiveScreen = active.Screen;

  return (
    <main className="shell">
      <section className="screen" aria-labelledby="screen-title">
        <ActiveScreen />
      </section>
      <nav className="bottom-nav" aria-label="主导航">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <button
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'nav-button active' : 'nav-button'}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
