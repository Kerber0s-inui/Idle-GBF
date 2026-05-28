# Idle GBF 首版垂直切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个手机优先的本地 PWA 首版垂直切片：火队主线首通、扫荡、奖励、强化、抽卡、存档和基础编成解释都能跑通。

**Architecture:** 使用 React/Vite 做展示层，核心规则全部放在纯 TypeScript 领域模块中。UI 通过状态层调用公式、战斗、远征、奖励、抽卡和存档模块，不在组件里写核心规则。

**Tech Stack:** TypeScript、React、Vite、Vitest、Testing Library、Playwright、Zod、vite-plugin-pwa、lucide-react、CSS Modules 或普通 CSS。

---

## 范围说明

本计划实现“首版垂直切片”，不是完整长期版本。它必须包含一条可玩的火队路线、首通战斗、扫荡周回、词条公式、基础强化、抽卡、JSON 存档导入导出和手机优先 UI。它不实现六属性全内容、高难机制、主动技能、联网账号、付费系统、完整 debuff/buff、追击、补伤和 GBF 素材再分发。

每个任务完成后运行指定测试并提交。若测试失败，先修复当前任务，不进入下一任务。

## 文件结构

根目录：

- `package.json`：脚本、依赖和项目元数据。
- `vite.config.ts`：Vite、Vitest、PWA 配置。
- `tsconfig.json`、`tsconfig.node.json`：TypeScript 配置。
- `index.html`：PWA 入口。
- `public/manifest.webmanifest`：PWA manifest。

源码：

- `src/main.tsx`：React 入口。
- `src/App.tsx`：挂载 `AppShell`。
- `src/styles.css`：全局手机优先样式和设计变量。
- `src/domain/types.ts`：所有领域类型、枚举和工具类型。
- `src/domain/content.ts`：首版火队路线的角色、武器、召唤石、敌人、副本、掉落表、卡池数据。
- `src/domain/formula.ts`：词条聚合、分区计算、伤害期望、上限计算、连击和奥义槽计算。
- `src/domain/battle.ts`：首通自动战斗模拟。
- `src/domain/rewards.ts`：掉落表、首通奖励、扫荡奖励汇总。
- `src/domain/gacha.ts`：本地资源抽卡。
- `src/domain/expedition.ts`：首通门槛、扫荡创建、进度和结算。
- `src/domain/save.ts`：Zod schema、存档导入导出和版本迁移。
- `src/domain/upgrade.ts`：角色/武器/召唤石强化与消耗。
- `src/state/gameStore.tsx`：React 状态容器和本地持久化。
- `src/ui/AppShell.tsx`：底部导航和页面框架。
- `src/ui/screens/ExpeditionScreen.tsx`：远征、首通、扫荡、结算。
- `src/ui/screens/FormationScreen.tsx`：队伍、武器盘、召唤石、公式拆解。
- `src/ui/screens/UpgradeScreen.tsx`：角色/武器/召唤石强化。
- `src/ui/screens/GachaScreen.tsx`：抽卡、卡池和抽卡结果。
- `src/ui/screens/InventoryScreen.tsx`：库存、掉落历史、存档导入导出和素材模式。
- `src/ui/components/BattleLog.tsx`：首通战斗日志。
- `src/ui/components/StatBreakdown.tsx`：公式分区展示。
- `src/ui/components/RewardSummary.tsx`：奖励汇总展示。
- `src/ui/components/IconBadge.tsx`：原创 CSS 图标/属性徽章。

测试：

- `src/test/setup.ts`：Testing Library setup。
- `src/domain/*.test.ts`：领域模块单元测试。
- `src/state/gameStore.test.tsx`：状态和持久化测试。
- `src/ui/AppShell.test.tsx`：主 UI 流程组件测试。
- `tests/e2e/mvp-flow.spec.ts`：手机视口端到端流程。

## Task 1: 创建 Vite/React/TypeScript/PWA 测试脚手架

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `public/manifest.webmanifest`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`

- [ ] **Step 1: 创建项目脚手架**

Run:

```powershell
npm create vite@latest app-scaffold -- --template react-ts
Copy-Item -LiteralPath .\app-scaffold\index.html -Destination .\index.html -Force
Copy-Item -LiteralPath .\app-scaffold\package.json -Destination .\package.json -Force
Copy-Item -LiteralPath .\app-scaffold\tsconfig.json -Destination .\tsconfig.json -Force
Copy-Item -LiteralPath .\app-scaffold\tsconfig.node.json -Destination .\tsconfig.node.json -Force
Copy-Item -LiteralPath .\app-scaffold\vite.config.ts -Destination .\vite.config.ts -Force
Copy-Item -LiteralPath .\app-scaffold\public -Destination .\public -Recurse -Force
Copy-Item -LiteralPath .\app-scaffold\src -Destination .\src -Recurse -Force
Remove-Item -LiteralPath .\app-scaffold -Recurse -Force
```

Expected: 当前目录生成 React + TypeScript Vite 项目文件，同时保留已有 `.gitignore` 和 `docs/`。

- [ ] **Step 2: 安装依赖**

Run:

```powershell
npm install
npm install zod lucide-react clsx
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test vite-plugin-pwa
```

Expected: `package-lock.json` 创建，依赖安装无错误。

- [ ] **Step 3: 配置 `package.json` 脚本**

Modify `package.json` scripts to exactly include:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 4: 配置 `vite.config.ts`**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['manifest.webmanifest'],
      manifest: {
        name: 'Idle GBF',
        short_name: 'Idle GBF',
        description: '手机优先的本地放置 RPG 原型',
        theme_color: '#10131a',
        background_color: '#10131a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: []
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true
  }
});
```

- [ ] **Step 5: 配置测试 setup**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 6: 写最小入口**

Create `src/App.tsx`:

```tsx
export function App() {
  return <main className="app">Idle GBF</main>;
}
```

Create `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/styles.css`:

```css
:root {
  color: #eef2ff;
  background: #10131a;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #10131a;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app {
  min-height: 100vh;
}
```

- [ ] **Step 7: 运行基础验证**

Run:

```powershell
npm test
npm run build
```

Expected: `npm test` 显示没有测试文件或 0 failed；`npm run build` exit code 0。

- [ ] **Step 8: 提交**

```powershell
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html public src
git commit -m "chore: scaffold pwa app"
```

## Task 2: 定义领域类型和首版内容数据

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/content.ts`
- Test: `src/domain/content.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/domain/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialCharacters, initialEnemies, initialQuests, initialWeapons, initialSummons } from './content';

describe('initial content', () => {
  it('contains one fire route with four starter characters', () => {
    expect(initialCharacters).toHaveLength(4);
    expect(initialCharacters.every((character) => character.element === 'fire')).toBe(true);
    expect(initialCharacters.every((character) => character.passives.length === 2)).toBe(true);
  });

  it('contains farmable fire grid weapons and one wind enemy route', () => {
    expect(initialWeapons.some((weapon) => weapon.source === 'farmable')).toBe(true);
    expect(initialSummons.some((summon) => summon.aura.target === 'magna')).toBe(true);
    expect(initialEnemies.every((enemy) => enemy.element === 'wind')).toBe(true);
    expect(initialQuests.every((quest) => quest.element === 'wind')).toBe(true);
    expect(initialQuests.every((quest) => quest.runDurationMs >= 5 * 60_000)).toBe(true);
    expect(initialQuests.every((quest) => quest.runDurationMs <= 10 * 60_000)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- src/domain/content.test.ts
```

Expected: FAIL，提示无法找到 `./content` 或导出不存在。

- [ ] **Step 3: 创建领域类型**

Create `src/domain/types.ts` with these exported types:

```ts
export type Element = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';
export type Rarity = 'R' | 'SR' | 'SSR';
export type WeaponSource = 'story' | 'farmable' | 'gacha';
export type SkillCategory = 'normal' | 'magna' | 'ex' | 'elemental' | 'independent';
export type AttackKind = 'normalAttack' | 'chargeAttack';
export type AssetMode = 'local-gbfal' | 'release-placeholder';

export interface StatBlock {
  hp: number;
  atk: number;
  defense: number;
}

export interface Passive {
  id: string;
  name: string;
  description: string;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  label: string;
  type:
    | 'attack'
    | 'hp'
    | 'stamina'
    | 'enmity'
    | 'criticalRate'
    | 'criticalDamage'
    | 'doubleAttackRate'
    | 'tripleAttackRate'
    | 'chargeDamage'
    | 'chargeCap'
    | 'damageCap'
    | 'normalAttackCap'
    | 'defense'
    | 'dropRate'
    | 'sweepEfficiency'
    | 'elementalAdvantage'
    | 'chargeGain'
    | 'startingCharge';
  value: number;
  category?: SkillCategory;
  source: 'character' | 'weapon' | 'summon';
}

export interface ChargeAttack {
  id: string;
  name: string;
  multiplier: number;
  chargeCost: number;
  cap: number;
}

export interface Character {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  stats: StatBlock;
  passives: [Passive, Passive];
  chargeAttack: ChargeAttack;
  assetKey: string;
}

export interface WeaponSkill {
  id: string;
  name: string;
  level: number;
  modifiers: Modifier[];
}

export interface Weapon {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  source: WeaponSource;
  level: number;
  maxLevel: number;
  stats: StatBlock;
  skills: WeaponSkill[];
  assetKey: string;
}

export interface Summon {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  stats: StatBlock;
  aura: {
    label: string;
    target: 'normal' | 'magna' | 'elemental';
    boost: number;
  };
  assetKey: string;
}

export interface Enemy {
  id: string;
  name: string;
  element: Element;
  stats: StatBlock;
  normalAttackDamage: number;
  assetKey: string;
}

export interface RewardTableEntry {
  itemId: string;
  kind: 'material' | 'weapon' | 'summon' | 'currency';
  quantity: number;
  chance: number;
}

export interface Quest {
  id: string;
  name: string;
  element: Element;
  difficulty: number;
  runDurationMs: number;
  enemyId: string;
  unlockAfterQuestId?: string;
  firstClearRewards: RewardTableEntry[];
  dropTable: RewardTableEntry[];
}

export interface WeaponGrid {
  mainWeaponId: string;
  weaponIds: string[];
}

export interface PartyLoadout {
  characterIds: string[];
  weaponGrid: WeaponGrid;
  mainSummonId: string;
  supportSummonId?: string;
}
```

- [ ] **Step 4: 创建首版内容**

Create `src/domain/content.ts` with four original fire characters, farmable weapons, one magna summon, one gacha summon, three wind enemies, and three quests. Use these exact IDs because later tasks reference them:

```ts
import type { Character, Enemy, Quest, Summon, Weapon } from './types';

export const initialCharacters: Character[] = [
  {
    id: 'char-leya-ember-rail',
    name: '莱娅·赤轨',
    element: 'fire',
    rarity: 'SSR',
    level: 1,
    maxLevel: 80,
    stats: { hp: 1180, atk: 780, defense: 100 },
    assetKey: 'character/leya-ember-rail',
    passives: [
      {
        id: 'passive-leya-solar-oath',
        name: '日冕誓约',
        description: '全队通常攻刃提升 8%。',
        modifiers: [{ id: 'mod-leya-normal-atk', label: '日冕誓约', type: 'attack', value: 0.08, category: 'normal', source: 'character' }]
      },
      {
        id: 'passive-leya-charge-loop',
        name: '赤轨回流',
        description: '自身奥义槽获取提升 10%。',
        modifiers: [{ id: 'mod-leya-charge-gain', label: '赤轨回流', type: 'chargeGain', value: 0.1, source: 'character' }]
      }
    ],
    chargeAttack: { id: 'ca-leya', name: '赤轨断层', multiplier: 4.5, chargeCost: 100, cap: 1_160_000 }
  },
  {
    id: 'char-caro-furnace',
    name: '卡洛·炉心',
    element: 'fire',
    rarity: 'SR',
    level: 1,
    maxLevel: 70,
    stats: { hp: 1320, atk: 610, defense: 112 },
    assetKey: 'character/caro-furnace',
    passives: [
      {
        id: 'passive-caro-guard',
        name: '耐热装甲',
        description: '全队防御提升 10%。',
        modifiers: [{ id: 'mod-caro-defense', label: '耐热装甲', type: 'defense', value: 0.1, source: 'character' }]
      },
      {
        id: 'passive-caro-hp',
        name: '炉压稳定',
        description: '全队 HP 提升 8%。',
        modifiers: [{ id: 'mod-caro-hp', label: '炉压稳定', type: 'hp', value: 0.08, category: 'normal', source: 'character' }]
      }
    ],
    chargeAttack: { id: 'ca-caro', name: '炉心重击', multiplier: 3.8, chargeCost: 100, cap: 920_000 }
  },
  {
    id: 'char-mira-astral-circuit',
    name: '米菈·星回路',
    element: 'fire',
    rarity: 'SSR',
    level: 1,
    maxLevel: 80,
    stats: { hp: 1040, atk: 840, defense: 92 },
    assetKey: 'character/mira-astral-circuit',
    passives: [
      {
        id: 'passive-mira-crit',
        name: '星火演算',
        description: '全队暴击率提升 12%。',
        modifiers: [{ id: 'mod-mira-crit-rate', label: '星火演算', type: 'criticalRate', value: 0.12, source: 'character' }]
      },
      {
        id: 'passive-mira-ca-cap',
        name: '回路过载',
        description: '全队奥义上限提升 8%。',
        modifiers: [{ id: 'mod-mira-ca-cap', label: '回路过载', type: 'chargeCap', value: 0.08, source: 'character' }]
      }
    ],
    chargeAttack: { id: 'ca-mira', name: '星火协议', multiplier: 4.7, chargeCost: 100, cap: 1_220_000 }
  },
  {
    id: 'char-noin-ash-protocol',
    name: '诺因·灰烬协议',
    element: 'fire',
    rarity: 'SR',
    level: 1,
    maxLevel: 70,
    stats: { hp: 980, atk: 690, defense: 88 },
    assetKey: 'character/noin-ash-protocol',
    passives: [
      {
        id: 'passive-noin-da',
        name: '热相同步',
        description: '全队 DA 率提升 10%。',
        modifiers: [{ id: 'mod-noin-da', label: '热相同步', type: 'doubleAttackRate', value: 0.1, source: 'character' }]
      },
      {
        id: 'passive-noin-drop',
        name: '残响检索',
        description: '扫荡掉落率提升 5%。',
        modifiers: [{ id: 'mod-noin-drop', label: '残响检索', type: 'dropRate', value: 0.05, source: 'character' }]
      }
    ],
    chargeAttack: { id: 'ca-noin', name: '灰烬脉冲', multiplier: 3.9, chargeCost: 100, cap: 940_000 }
  }
];

export const initialWeapons: Weapon[] = [
  {
    id: 'weapon-red-rail-saber',
    name: '赤轨誓剑',
    element: 'fire',
    rarity: 'SSR',
    source: 'story',
    level: 1,
    maxLevel: 100,
    stats: { hp: 120, atk: 410, defense: 0 },
    assetKey: 'weapon/red-rail-saber',
    skills: [{ id: 'skill-red-rail-normal', name: '赤轨攻刃', level: 1, modifiers: [{ id: 'mod-red-rail-normal', label: '赤轨攻刃', type: 'attack', value: 0.08, category: 'normal', source: 'weapon' }] }]
  },
  {
    id: 'weapon-furnace-grid-blade',
    name: '第七炉心刃',
    element: 'fire',
    rarity: 'SSR',
    source: 'farmable',
    level: 1,
    maxLevel: 100,
    stats: { hp: 96, atk: 390, defense: 0 },
    assetKey: 'weapon/furnace-grid-blade',
    skills: [{ id: 'skill-furnace-magna', name: '炉心方阵攻刃', level: 1, modifiers: [{ id: 'mod-furnace-magna', label: '炉心方阵攻刃', type: 'attack', value: 0.07, category: 'magna', source: 'weapon' }] }]
  }
];

export const initialSummons: Summon[] = [
  {
    id: 'summon-helios-engine',
    name: '赫曜机神',
    element: 'fire',
    rarity: 'SSR',
    level: 1,
    maxLevel: 100,
    stats: { hp: 380, atk: 960, defense: 0 },
    aura: { label: '方阵技能效果提升 50%', target: 'magna', boost: 0.5 },
    assetKey: 'summon/helios-engine'
  },
  {
    id: 'summon-aurora-core',
    name: '赤曦炉核',
    element: 'fire',
    rarity: 'SSR',
    level: 1,
    maxLevel: 100,
    stats: { hp: 420, atk: 880, defense: 0 },
    aura: { label: '火属性攻击提升 40%', target: 'elemental', boost: 0.4 },
    assetKey: 'summon/aurora-core'
  }
];

export const initialEnemies: Enemy[] = [
  { id: 'enemy-wind-sentinel-1', name: '风蚀守卫 I', element: 'wind', stats: { hp: 48_000, atk: 520, defense: 100 }, normalAttackDamage: 260, assetKey: 'enemy/wind-sentinel-1' },
  { id: 'enemy-wind-sentinel-2', name: '风蚀守卫 II', element: 'wind', stats: { hp: 118_000, atk: 980, defense: 112 }, normalAttackDamage: 540, assetKey: 'enemy/wind-sentinel-2' },
  { id: 'enemy-wind-sentinel-3', name: '风蚀守卫 III', element: 'wind', stats: { hp: 260_000, atk: 1_650, defense: 125 }, normalAttackDamage: 940, assetKey: 'enemy/wind-sentinel-3' }
];

export const initialQuests: Quest[] = [
  {
    id: 'quest-main-1',
    name: '主线 1：风蚀外缘',
    element: 'wind',
    difficulty: 1,
    runDurationMs: 5 * 60_000,
    enemyId: 'enemy-wind-sentinel-1',
    firstClearRewards: [{ itemId: 'crystal', kind: 'currency', quantity: 300, chance: 1 }],
    dropTable: [{ itemId: 'weapon-furnace-grid-blade', kind: 'weapon', quantity: 1, chance: 0.08 }]
  },
  {
    id: 'quest-main-2',
    name: '主线 2：裂风回廊',
    element: 'wind',
    difficulty: 2,
    runDurationMs: 7 * 60_000,
    enemyId: 'enemy-wind-sentinel-2',
    unlockAfterQuestId: 'quest-main-1',
    firstClearRewards: [{ itemId: 'gacha-ticket', kind: 'currency', quantity: 1, chance: 1 }],
    dropTable: [{ itemId: 'weapon-furnace-grid-blade', kind: 'weapon', quantity: 1, chance: 0.12 }]
  },
  {
    id: 'quest-main-3',
    name: '主线 3：星轨断面',
    element: 'wind',
    difficulty: 3,
    runDurationMs: 10 * 60_000,
    enemyId: 'enemy-wind-sentinel-3',
    unlockAfterQuestId: 'quest-main-2',
    firstClearRewards: [{ itemId: 'crystal', kind: 'currency', quantity: 600, chance: 1 }],
    dropTable: [{ itemId: 'summon-helios-engine', kind: 'summon', quantity: 1, chance: 0.03 }]
  }
];
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```powershell
npm test -- src/domain/content.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交**

```powershell
git add src/domain/types.ts src/domain/content.ts src/domain/content.test.ts
git commit -m "feat: add initial game content"
```

## Task 3: 实现公式与词条计算

**Files:**
- Create: `src/domain/formula.ts`
- Test: `src/domain/formula.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/domain/formula.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateAttackBreakdown, calculateChargeGain, clampModifierCaps, rollMultiattack } from './formula';

describe('formula', () => {
  it('multiplies normal, magna, ex, elemental, and independent attack sections', () => {
    const result = calculateAttackBreakdown({
      baseAttack: 1000,
      modifiers: [
        { id: 'n', label: 'normal', type: 'attack', value: 0.2, category: 'normal', source: 'weapon' },
        { id: 'm', label: 'magna', type: 'attack', value: 0.3, category: 'magna', source: 'weapon' },
        { id: 'e', label: 'ex', type: 'attack', value: 0.1, category: 'ex', source: 'weapon' },
        { id: 'el', label: 'elemental', type: 'attack', value: 0.5, category: 'elemental', source: 'summon' },
        { id: 'i', label: 'independent', type: 'attack', value: 0.1, category: 'independent', source: 'character' }
      ],
      magnaBoost: 0.5,
      normalBoost: 0,
      hpRatio: 1,
      attackKind: 'normalAttack'
    });

    expect(result.finalAttack).toBeCloseTo(1000 * 1.2 * 1.45 * 1.1 * 1.5 * 1.1, 4);
    expect(result.sections.magna).toBeCloseTo(0.45, 4);
  });

  it('caps critical rate, damage cap, drop rate, and sweep efficiency', () => {
    const capped = clampModifierCaps({
      criticalRate: 1.7,
      damageCap: 0.8,
      normalAttackCap: 0.9,
      chargeCap: 0.9,
      dropRate: 0.9,
      sweepEfficiency: -0.8,
      damageReduction: 0.9
    });

    expect(capped.criticalRate).toBe(1);
    expect(capped.damageCap).toBe(0.2);
    expect(capped.normalAttackCap).toBe(0.5);
    expect(capped.chargeCap).toBe(0.5);
    expect(capped.dropRate).toBe(0.5);
    expect(capped.sweepEfficiency).toBe(-0.3);
    expect(capped.damageReduction).toBe(0.7);
  });

  it('links multiattack to charge gain', () => {
    expect(calculateChargeGain({ baseGain: 10, hitCount: 1, chargeGainModifier: 0 })).toBe(10);
    expect(calculateChargeGain({ baseGain: 10, hitCount: 2, chargeGainModifier: 0 })).toBe(20);
    expect(calculateChargeGain({ baseGain: 10, hitCount: 3, chargeGainModifier: 0.25 })).toBe(37.5);
  });

  it('prioritizes triple attack over double attack', () => {
    expect(rollMultiattack({ doubleAttackRate: 1, tripleAttackRate: 1, random: () => 0.2 })).toEqual({ kind: 'ta', hitCount: 3 });
    expect(rollMultiattack({ doubleAttackRate: 1, tripleAttackRate: 0, random: () => 0.2 })).toEqual({ kind: 'da', hitCount: 2 });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- src/domain/formula.test.ts
```

Expected: FAIL，提示 `./formula` 不存在。

- [ ] **Step 3: 实现公式模块**

Create `src/domain/formula.ts` with these exports:

```ts
import type { AttackKind, Modifier } from './types';

export interface AttackBreakdownInput {
  baseAttack: number;
  modifiers: Modifier[];
  magnaBoost: number;
  normalBoost: number;
  hpRatio: number;
  attackKind: AttackKind;
}

export interface AttackBreakdown {
  finalAttack: number;
  sections: {
    normal: number;
    magna: number;
    ex: number;
    elemental: number;
    independent: number;
    stamina: number;
    enmity: number;
  };
}

export interface CappedModifiers {
  criticalRate: number;
  damageCap: number;
  normalAttackCap: number;
  chargeCap: number;
  dropRate: number;
  sweepEfficiency: number;
  damageReduction: number;
}

function sumModifiers(modifiers: Modifier[], type: Modifier['type'], category?: Modifier['category']) {
  return modifiers
    .filter((modifier) => modifier.type === type && (category === undefined || modifier.category === category))
    .reduce((total, modifier) => total + modifier.value, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampModifierCaps(input: CappedModifiers): CappedModifiers {
  return {
    criticalRate: clamp(input.criticalRate, 0, 1),
    damageCap: clamp(input.damageCap, 0, 0.2),
    normalAttackCap: clamp(input.normalAttackCap, 0, 0.5),
    chargeCap: clamp(input.chargeCap, 0, 0.5),
    dropRate: clamp(input.dropRate, 0, 0.5),
    sweepEfficiency: clamp(input.sweepEfficiency, -0.3, 0),
    damageReduction: clamp(input.damageReduction, 0, 0.7)
  };
}

export function calculateAttackBreakdown(input: AttackBreakdownInput): AttackBreakdown {
  const normal = sumModifiers(input.modifiers, 'attack', 'normal') * (1 + input.normalBoost);
  const magna = sumModifiers(input.modifiers, 'attack', 'magna') * (1 + input.magnaBoost);
  const ex = sumModifiers(input.modifiers, 'attack', 'ex');
  const elemental = sumModifiers(input.modifiers, 'attack', 'elemental');
  const independent = sumModifiers(input.modifiers, 'attack', 'independent');
  const stamina = sumModifiers(input.modifiers, 'stamina') * Math.max(0, input.hpRatio);
  const enmity = sumModifiers(input.modifiers, 'enmity') * Math.max(0, 1 - input.hpRatio);

  const finalAttack =
    input.baseAttack *
    (1 + normal) *
    (1 + magna) *
    (1 + ex) *
    (1 + elemental) *
    (1 + independent) *
    (1 + stamina + enmity);

  return { finalAttack, sections: { normal, magna, ex, elemental, independent, stamina, enmity } };
}

export function calculateChargeGain(input: { baseGain: number; hitCount: number; chargeGainModifier: number }) {
  return input.baseGain * input.hitCount * (1 + input.chargeGainModifier);
}

export function rollMultiattack(input: { doubleAttackRate: number; tripleAttackRate: number; random: () => number }) {
  const tripleAttackRate = clamp(input.tripleAttackRate, 0, 1);
  const doubleAttackRate = clamp(input.doubleAttackRate, 0, 1);
  const firstRoll = input.random();
  if (firstRoll < tripleAttackRate) return { kind: 'ta' as const, hitCount: 3 };
  const secondRoll = input.random();
  if (secondRoll < doubleAttackRate) return { kind: 'da' as const, hitCount: 2 };
  return { kind: 'sa' as const, hitCount: 1 };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
npm test -- src/domain/formula.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/domain/formula.ts src/domain/formula.test.ts
git commit -m "feat: add formula calculations"
```

## Task 4: 实现首通自动战斗模拟

**Files:**
- Create: `src/domain/battle.ts`
- Test: `src/domain/battle.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/domain/battle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialCharacters, initialEnemies, initialSummons, initialWeapons } from './content';
import { simulateBattle } from './battle';

const baseLoadout = {
  characterIds: initialCharacters.map((character) => character.id),
  weaponGrid: {
    mainWeaponId: initialWeapons[0].id,
    weaponIds: initialWeapons.map((weapon) => weapon.id)
  },
  mainSummonId: initialSummons[0].id,
  supportSummonId: initialSummons[1].id
};

describe('battle simulation', () => {
  it('resolves a first-clear battle with logs and charge attacks', () => {
    const result = simulateBattle({
      characters: initialCharacters,
      weapons: initialWeapons,
      summons: initialSummons,
      enemy: initialEnemies[0],
      loadout: baseLoadout,
      random: () => 0.01
    });

    expect(result.outcome).toBe('win');
    expect(result.turns.length).toBeGreaterThan(0);
    expect(result.turns.some((turn) => turn.events.some((event) => event.kind === 'chargeAttack'))).toBe(true);
  });

  it('can lose when enemy damage overwhelms the party', () => {
    const result = simulateBattle({
      characters: initialCharacters,
      weapons: initialWeapons,
      summons: initialSummons,
      enemy: { ...initialEnemies[2], normalAttackDamage: 20_000 },
      loadout: baseLoadout,
      random: () => 0.99
    });

    expect(result.outcome).toBe('loss');
    expect(result.summary).toBe('队伍被击败');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- src/domain/battle.test.ts
```

Expected: FAIL，提示 `./battle` 不存在。

- [ ] **Step 3: 实现战斗模块**

Create `src/domain/battle.ts` with these public shapes and logic:

```ts
import type { Character, Enemy, Modifier, PartyLoadout, Summon, Weapon } from './types';
import { calculateAttackBreakdown, calculateChargeGain, rollMultiattack } from './formula';

export interface BattleEvent {
  kind: 'normalAttack' | 'chargeAttack' | 'enemyAttack' | 'passive';
  actor: string;
  target?: string;
  label: string;
  damage?: number;
  hitCount?: number;
  chargeGain?: number;
}

export interface BattleTurn {
  turn: number;
  events: BattleEvent[];
}

export interface BattleResult {
  outcome: 'win' | 'loss';
  summary: '胜利' | '队伍被击败';
  turns: BattleTurn[];
  finalEnemyHp: number;
  finalPartyHp: Record<string, number>;
}

export interface SimulateBattleInput {
  characters: Character[];
  weapons: Weapon[];
  summons: Summon[];
  enemy: Enemy;
  loadout: PartyLoadout;
  random: () => number;
}

function collectModifiers(characters: Character[], weapons: Weapon[]): Modifier[] {
  return [
    ...characters.flatMap((character) => character.passives.flatMap((passive) => passive.modifiers)),
    ...weapons.flatMap((weapon) => weapon.skills.flatMap((skill) => skill.modifiers))
  ];
}

function getSummonBoosts(loadout: PartyLoadout, summons: Summon[]) {
  const activeSummons = summons.filter((summon) => summon.id === loadout.mainSummonId || summon.id === loadout.supportSummonId);
  return {
    magnaBoost: activeSummons.filter((summon) => summon.aura.target === 'magna').reduce((total, summon) => total + summon.aura.boost, 0),
    normalBoost: activeSummons.filter((summon) => summon.aura.target === 'normal').reduce((total, summon) => total + summon.aura.boost, 0),
    elementalAttack: activeSummons.filter((summon) => summon.aura.target === 'elemental').reduce((total, summon) => total + summon.aura.boost, 0)
  };
}

export function simulateBattle(input: SimulateBattleInput): BattleResult {
  const party = input.loadout.characterIds.map((id) => input.characters.find((character) => character.id === id)).filter((character): character is Character => Boolean(character));
  const gridWeapons = input.loadout.weaponGrid.weaponIds.map((id) => input.weapons.find((weapon) => weapon.id === id)).filter((weapon): weapon is Weapon => Boolean(weapon));
  const modifiers = collectModifiers(party, gridWeapons);
  const summonBoosts = getSummonBoosts(input.loadout, input.summons);
  const partyHp = Object.fromEntries(party.map((character) => [character.id, character.stats.hp])) as Record<string, number>;
  const charge = Object.fromEntries(party.map((character) => [character.id, 70])) as Record<string, number>;
  let enemyHp = input.enemy.stats.hp;
  const turns: BattleTurn[] = [];

  for (let turn = 1; turn <= 200; turn += 1) {
    const events: BattleEvent[] = [];

    for (const character of party) {
      if (partyHp[character.id] <= 0 || enemyHp <= 0) continue;
      const baseAttack = character.stats.atk + gridWeapons.reduce((total, weapon) => total + weapon.stats.atk, 0) / Math.max(1, party.length);
      const hpRatio = partyHp[character.id] / character.stats.hp;
      const chargeGainModifier = modifiers.filter((modifier) => modifier.type === 'chargeGain').reduce((total, modifier) => total + modifier.value, 0);
      const doubleAttackRate = modifiers.filter((modifier) => modifier.type === 'doubleAttackRate').reduce((total, modifier) => total + modifier.value, 0);
      const tripleAttackRate = modifiers.filter((modifier) => modifier.type === 'tripleAttackRate').reduce((total, modifier) => total + modifier.value, 0);

      if (charge[character.id] >= character.chargeAttack.chargeCost) {
        const breakdown = calculateAttackBreakdown({
          baseAttack,
          modifiers: [...modifiers, { id: 'element-advantage', label: '属性克制', type: 'attack', value: 0.5 + summonBoosts.elementalAttack, category: 'elemental', source: 'summon' }],
          magnaBoost: summonBoosts.magnaBoost,
          normalBoost: summonBoosts.normalBoost,
          hpRatio,
          attackKind: 'chargeAttack'
        });
        const damage = Math.max(1, Math.floor(Math.min(breakdown.finalAttack * character.chargeAttack.multiplier, character.chargeAttack.cap)));
        enemyHp -= damage;
        charge[character.id] = 0;
        events.push({ kind: 'chargeAttack', actor: character.name, target: input.enemy.name, label: character.chargeAttack.name, damage });
      } else {
        const multiattack = rollMultiattack({ doubleAttackRate, tripleAttackRate, random: input.random });
        const breakdown = calculateAttackBreakdown({
          baseAttack,
          modifiers: [...modifiers, { id: 'element-advantage', label: '属性克制', type: 'attack', value: 0.5 + summonBoosts.elementalAttack, category: 'elemental', source: 'summon' }],
          magnaBoost: summonBoosts.magnaBoost,
          normalBoost: summonBoosts.normalBoost,
          hpRatio,
          attackKind: 'normalAttack'
        });
        const damage = Math.max(1, Math.floor((breakdown.finalAttack / 8) * multiattack.hitCount));
        const chargeGain = calculateChargeGain({ baseGain: 10, hitCount: multiattack.hitCount, chargeGainModifier });
        enemyHp -= damage;
        charge[character.id] += chargeGain;
        events.push({ kind: 'normalAttack', actor: character.name, target: input.enemy.name, label: multiattack.kind.toUpperCase(), damage, hitCount: multiattack.hitCount, chargeGain });
      }
    }

    if (enemyHp <= 0) {
      turns.push({ turn, events });
      return { outcome: 'win', summary: '胜利', turns, finalEnemyHp: 0, finalPartyHp: partyHp };
    }

    const aliveParty = party.filter((character) => partyHp[character.id] > 0);
    for (const character of aliveParty) {
      const defenseModifier = modifiers.filter((modifier) => modifier.type === 'defense').reduce((total, modifier) => total + modifier.value, 0);
      const damage = Math.max(1, Math.floor(input.enemy.normalAttackDamage / (1 + defenseModifier)));
      partyHp[character.id] -= damage;
      events.push({ kind: 'enemyAttack', actor: input.enemy.name, target: character.name, label: '普通攻击', damage });
    }

    turns.push({ turn, events });
    if (party.every((character) => partyHp[character.id] <= 0)) {
      return { outcome: 'loss', summary: '队伍被击败', turns, finalEnemyHp: Math.max(0, enemyHp), finalPartyHp: partyHp };
    }
  }

  return { outcome: 'loss', summary: '队伍被击败', turns, finalEnemyHp: Math.max(0, enemyHp), finalPartyHp: partyHp };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
npm test -- src/domain/battle.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/domain/battle.ts src/domain/battle.test.ts
git commit -m "feat: add first-clear battle simulation"
```

## Task 5: 实现奖励、抽卡和强化规则

**Files:**
- Create: `src/domain/rewards.ts`
- Create: `src/domain/gacha.ts`
- Create: `src/domain/upgrade.ts`
- Test: `src/domain/rewards.test.ts`
- Test: `src/domain/gacha.test.ts`
- Test: `src/domain/upgrade.test.ts`

- [ ] **Step 1: 写奖励失败测试**

Create `src/domain/rewards.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialQuests } from './content';
import { rollRewards, summarizeRewards } from './rewards';

describe('rewards', () => {
  it('always grants first-clear rewards and rolls farming drops', () => {
    const quest = initialQuests[0];
    const rewards = rollRewards({ quest, runCount: 10, includeFirstClear: true, dropRateBonus: 0, random: () => 0 });
    expect(rewards.some((reward) => reward.itemId === 'crystal' && reward.quantity === 300)).toBe(true);
    expect(rewards.some((reward) => reward.itemId === 'weapon-furnace-grid-blade')).toBe(true);
  });

  it('aggregates reward quantities by item and kind', () => {
    const summary = summarizeRewards([
      { itemId: 'crystal', kind: 'currency', quantity: 100 },
      { itemId: 'crystal', kind: 'currency', quantity: 200 }
    ]);
    expect(summary).toEqual([{ itemId: 'crystal', kind: 'currency', quantity: 300 }]);
  });
});
```

- [ ] **Step 2: 写抽卡失败测试**

Create `src/domain/gacha.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialCharacters, initialSummons, initialWeapons } from './content';
import { createInitialGachaPool, pullGacha } from './gacha';

describe('gacha', () => {
  it('spends crystals and returns ten results', () => {
    const pool = createInitialGachaPool(initialCharacters, initialWeapons, initialSummons);
    const result = pullGacha({ pool, crystals: 3000, tickets: 0, count: 10, random: () => 0.01 });
    expect(result.remainingCrystals).toBe(0);
    expect(result.results).toHaveLength(10);
  });

  it('rejects pulls without enough resources', () => {
    const pool = createInitialGachaPool(initialCharacters, initialWeapons, initialSummons);
    expect(() => pullGacha({ pool, crystals: 100, tickets: 0, count: 10, random: () => 0.5 })).toThrow('抽卡资源不足');
  });
});
```

- [ ] **Step 3: 写强化失败测试**

Create `src/domain/upgrade.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialCharacters, initialWeapons } from './content';
import { upgradeCharacterLevel, upgradeWeaponSkill } from './upgrade';

describe('upgrade', () => {
  it('levels a character when enough ember chips are available', () => {
    const result = upgradeCharacterLevel({ character: initialCharacters[0], materials: { 'ember-chip': 5 } });
    expect(result.character.level).toBe(2);
    expect(result.materials['ember-chip']).toBe(4);
  });

  it('levels a weapon skill with furnace cores', () => {
    const result = upgradeWeaponSkill({ weapon: initialWeapons[0], materials: { 'furnace-core': 3 } });
    expect(result.weapon.skills[0].level).toBe(2);
    expect(result.materials['furnace-core']).toBe(2);
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run:

```powershell
npm test -- src/domain/rewards.test.ts src/domain/gacha.test.ts src/domain/upgrade.test.ts
```

Expected: FAIL，提示模块不存在。

- [ ] **Step 5: 实现奖励模块**

Create `src/domain/rewards.ts`:

```ts
import type { Quest, RewardTableEntry } from './types';

export interface RewardStack {
  itemId: string;
  kind: RewardTableEntry['kind'];
  quantity: number;
}

export function summarizeRewards(rewards: RewardStack[]): RewardStack[] {
  const map = new Map<string, RewardStack>();
  for (const reward of rewards) {
    const key = `${reward.kind}:${reward.itemId}`;
    const current = map.get(key);
    map.set(key, current ? { ...current, quantity: current.quantity + reward.quantity } : { ...reward });
  }
  return [...map.values()];
}

export function rollRewards(input: { quest: Quest; runCount: number; includeFirstClear: boolean; dropRateBonus: number; random: () => number }): RewardStack[] {
  const rewards: RewardStack[] = [];
  if (input.includeFirstClear) {
    rewards.push(...input.quest.firstClearRewards.map((reward) => ({ itemId: reward.itemId, kind: reward.kind, quantity: reward.quantity })));
  }
  for (let run = 0; run < input.runCount; run += 1) {
    for (const entry of input.quest.dropTable) {
      if (input.random() <= Math.min(1, entry.chance * (1 + input.dropRateBonus))) {
        rewards.push({ itemId: entry.itemId, kind: entry.kind, quantity: entry.quantity });
      }
    }
    rewards.push({ itemId: 'ember-chip', kind: 'material', quantity: 1 });
    if (input.quest.difficulty >= 2) rewards.push({ itemId: 'furnace-core', kind: 'material', quantity: 1 });
  }
  return summarizeRewards(rewards);
}
```

- [ ] **Step 6: 实现抽卡模块**

Create `src/domain/gacha.ts`:

```ts
import type { Character, Summon, Weapon } from './types';

export interface GachaPoolItem {
  id: string;
  kind: 'character' | 'weapon' | 'summon';
  rarity: 'R' | 'SR' | 'SSR';
  weight: number;
}

export interface GachaPool {
  id: string;
  name: string;
  items: GachaPoolItem[];
}

export function createInitialGachaPool(characters: Character[], weapons: Weapon[], summons: Summon[]): GachaPool {
  return {
    id: 'standard-furnace-pool',
    name: '星炉常驻池',
    items: [
      ...characters.map((character) => ({ id: character.id, kind: 'character' as const, rarity: character.rarity, weight: character.rarity === 'SSR' ? 3 : 12 })),
      ...weapons.map((weapon) => ({ id: weapon.id, kind: 'weapon' as const, rarity: weapon.rarity, weight: weapon.rarity === 'SSR' ? 4 : 15 })),
      ...summons.map((summon) => ({ id: summon.id, kind: 'summon' as const, rarity: summon.rarity, weight: summon.rarity === 'SSR' ? 2 : 10 }))
    ]
  };
}

export function pullGacha(input: { pool: GachaPool; crystals: number; tickets: number; count: 1 | 10; random: () => number }) {
  const ticketCost = input.count === 1 ? 1 : 10;
  const crystalCost = input.count === 1 ? 300 : 3000;
  let remainingTickets = input.tickets;
  let remainingCrystals = input.crystals;
  if (remainingTickets >= ticketCost) remainingTickets -= ticketCost;
  else if (remainingCrystals >= crystalCost) remainingCrystals -= crystalCost;
  else throw new Error('抽卡资源不足');

  const totalWeight = input.pool.items.reduce((total, item) => total + item.weight, 0);
  const results: GachaPoolItem[] = [];
  for (let i = 0; i < input.count; i += 1) {
    let roll = input.random() * totalWeight;
    const picked = input.pool.items.find((item) => {
      roll -= item.weight;
      return roll <= 0;
    });
    results.push(picked ?? input.pool.items[input.pool.items.length - 1]);
  }
  return { results, remainingCrystals, remainingTickets };
}
```

- [ ] **Step 7: 实现强化模块**

Create `src/domain/upgrade.ts`:

```ts
import type { Character, Weapon } from './types';

export type MaterialBag = Record<string, number>;

function consume(materials: MaterialBag, itemId: string, quantity: number) {
  if ((materials[itemId] ?? 0) < quantity) throw new Error(`素材不足：${itemId}`);
  return { ...materials, [itemId]: (materials[itemId] ?? 0) - quantity };
}

export function upgradeCharacterLevel(input: { character: Character; materials: MaterialBag }) {
  if (input.character.level >= input.character.maxLevel) return input;
  return {
    character: { ...input.character, level: input.character.level + 1, stats: { ...input.character.stats, hp: input.character.stats.hp + 18, atk: input.character.stats.atk + 12 } },
    materials: consume(input.materials, 'ember-chip', 1)
  };
}

export function upgradeWeaponSkill(input: { weapon: Weapon; materials: MaterialBag }) {
  const firstSkill = input.weapon.skills[0];
  if (!firstSkill) return input;
  return {
    weapon: { ...input.weapon, skills: [{ ...firstSkill, level: firstSkill.level + 1, modifiers: firstSkill.modifiers.map((modifier) => ({ ...modifier, value: modifier.value + 0.01 })) }, ...input.weapon.skills.slice(1)] },
    materials: consume(input.materials, 'furnace-core', 1)
  };
}
```

- [ ] **Step 8: 运行测试确认通过**

Run:

```powershell
npm test -- src/domain/rewards.test.ts src/domain/gacha.test.ts src/domain/upgrade.test.ts
```

Expected: PASS。

- [ ] **Step 9: 提交**

```powershell
git add src/domain/rewards.ts src/domain/gacha.ts src/domain/upgrade.ts src/domain/rewards.test.ts src/domain/gacha.test.ts src/domain/upgrade.test.ts
git commit -m "feat: add rewards gacha and upgrades"
```

## Task 6: 实现远征、扫荡和存档 schema

**Files:**
- Create: `src/domain/expedition.ts`
- Create: `src/domain/save.ts`
- Test: `src/domain/expedition.test.ts`
- Test: `src/domain/save.test.ts`

- [ ] **Step 1: 写远征失败测试**

Create `src/domain/expedition.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialQuests } from './content';
import { createSweepRun, getSweepProgress, settleSweepRun } from './expedition';

describe('expedition', () => {
  it('caps sweep count at 100 and calculates duration', () => {
    const run = createSweepRun({ quest: initialQuests[0], requestedRuns: 120, startedAt: 1000, sweepEfficiency: 0 });
    expect(run.totalRuns).toBe(100);
    expect(run.endsAt).toBe(1000 + initialQuests[0].runDurationMs * 100);
  });

  it('reports progress and settles completed runs', () => {
    const run = createSweepRun({ quest: initialQuests[0], requestedRuns: 10, startedAt: 0, sweepEfficiency: 0 });
    expect(getSweepProgress({ run, now: initialQuests[0].runDurationMs * 5 }).completedRuns).toBe(5);
    const settlement = settleSweepRun({ run, quest: initialQuests[0], now: run.endsAt, dropRateBonus: 0, random: () => 0 });
    expect(settlement.completedRuns).toBe(10);
    expect(settlement.rewards.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 写存档失败测试**

Create `src/domain/save.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialSave, exportSave, importSave } from './save';

describe('save', () => {
  it('exports and imports versioned save data', () => {
    const save = createInitialSave(1234);
    const json = exportSave(save);
    const imported = importSave(json);
    expect(imported.version).toBe(1);
    expect(imported.createdAt).toBe(1234);
  });

  it('rejects invalid save json', () => {
    expect(() => importSave('{ "version": "bad" }')).toThrow('存档格式无效');
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```powershell
npm test -- src/domain/expedition.test.ts src/domain/save.test.ts
```

Expected: FAIL，提示模块不存在。

- [ ] **Step 4: 实现远征模块**

Create `src/domain/expedition.ts`:

```ts
import type { Quest } from './types';
import { rollRewards, type RewardStack } from './rewards';

export interface ExpeditionRun {
  id: string;
  questId: string;
  startedAt: number;
  endsAt: number;
  totalRuns: number;
  runDurationMs: number;
}

export function createSweepRun(input: { quest: Quest; requestedRuns: number; startedAt: number; sweepEfficiency: number }): ExpeditionRun {
  const totalRuns = Math.min(100, Math.max(1, Math.floor(input.requestedRuns)));
  const runDurationMs = Math.max(60_000, Math.floor(input.quest.runDurationMs * (1 + input.sweepEfficiency)));
  return {
    id: `run-${input.quest.id}-${input.startedAt}`,
    questId: input.quest.id,
    startedAt: input.startedAt,
    endsAt: input.startedAt + runDurationMs * totalRuns,
    totalRuns,
    runDurationMs
  };
}

export function getSweepProgress(input: { run: ExpeditionRun; now: number }) {
  const elapsed = Math.max(0, input.now - input.run.startedAt);
  const completedRuns = Math.min(input.run.totalRuns, Math.floor(elapsed / input.run.runDurationMs));
  return { completedRuns, remainingRuns: input.run.totalRuns - completedRuns, isComplete: completedRuns >= input.run.totalRuns };
}

export function settleSweepRun(input: { run: ExpeditionRun; quest: Quest; now: number; dropRateBonus: number; random: () => number }): { completedRuns: number; rewards: RewardStack[] } {
  const progress = getSweepProgress({ run: input.run, now: input.now });
  return {
    completedRuns: progress.completedRuns,
    rewards: rollRewards({ quest: input.quest, runCount: progress.completedRuns, includeFirstClear: false, dropRateBonus: input.dropRateBonus, random: input.random })
  };
}
```

- [ ] **Step 5: 实现存档模块**

Create `src/domain/save.ts`:

```ts
import { z } from 'zod';

export const SaveFileSchema = z.object({
  version: z.literal(1),
  createdAt: z.number(),
  updatedAt: z.number(),
  progress: z.object({
    clearedQuestIds: z.array(z.string()),
    unlockedCharacterIds: z.array(z.string())
  }),
  inventory: z.object({
    characterIds: z.array(z.string()),
    weaponIds: z.array(z.string()),
    summonIds: z.array(z.string()),
    materials: z.record(z.string(), z.number()),
    currencies: z.record(z.string(), z.number())
  }),
  activeRun: z
    .object({
      id: z.string(),
      questId: z.string(),
      startedAt: z.number(),
      endsAt: z.number(),
      totalRuns: z.number(),
      runDurationMs: z.number()
    })
    .nullable()
});

export type SaveFile = z.infer<typeof SaveFileSchema>;

export function createInitialSave(now: number): SaveFile {
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    progress: { clearedQuestIds: [], unlockedCharacterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'] },
    inventory: {
      characterIds: ['char-leya-ember-rail', 'char-caro-furnace', 'char-mira-astral-circuit', 'char-noin-ash-protocol'],
      weaponIds: ['weapon-red-rail-saber', 'weapon-furnace-grid-blade'],
      summonIds: ['summon-helios-engine', 'summon-aurora-core'],
      materials: { 'ember-chip': 0, 'furnace-core': 0 },
      currencies: { crystal: 0, 'gacha-ticket': 0 }
    },
    activeRun: null
  };
}

export function exportSave(save: SaveFile) {
  return JSON.stringify({ ...save, updatedAt: Date.now() }, null, 2);
}

export function importSave(json: string): SaveFile {
  try {
    return SaveFileSchema.parse(JSON.parse(json));
  } catch {
    throw new Error('存档格式无效');
  }
}
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```powershell
npm test -- src/domain/expedition.test.ts src/domain/save.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交**

```powershell
git add src/domain/expedition.ts src/domain/save.ts src/domain/expedition.test.ts src/domain/save.test.ts
git commit -m "feat: add expedition and save logic"
```

## Task 7: 实现 React 状态层和本地持久化

**Files:**
- Create: `src/state/gameStore.tsx`
- Test: `src/state/gameStore.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `src/state/gameStore.test.tsx`:

```tsx
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { GameProvider, useGame } from './gameStore';

beforeEach(() => localStorage.clear());

describe('game store', () => {
  it('creates a default save and starts a sweep after clearing a quest', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameProvider now={() => 1000}>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });

    act(() => result.current.markQuestCleared('quest-main-1'));
    act(() => result.current.startSweep('quest-main-1', 5));

    expect(result.current.save.progress.clearedQuestIds).toContain('quest-main-1');
    expect(result.current.save.activeRun?.totalRuns).toBe(5);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- src/state/gameStore.test.tsx
```

Expected: FAIL，提示 `./gameStore` 不存在。

- [ ] **Step 3: 实现状态层**

Create `src/state/gameStore.tsx`:

```tsx
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import { initialQuests } from '../domain/content';
import { createSweepRun } from '../domain/expedition';
import { createInitialSave, exportSave, importSave, type SaveFile } from '../domain/save';

interface GameContextValue {
  save: SaveFile;
  markQuestCleared: (questId: string) => void;
  startSweep: (questId: string, count: number) => void;
  exportCurrentSave: () => string;
  importSaveJson: (json: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);
const storageKey = 'idle-gbf-save-v1';

export function GameProvider({ children, now = () => Date.now() }: { children: ReactNode; now?: () => number }) {
  const [save, setSave] = useState<SaveFile>(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return createInitialSave(now());
    try {
      return importSave(stored);
    } catch {
      return createInitialSave(now());
    }
  });

  function persist(next: SaveFile) {
    setSave(next);
    localStorage.setItem(storageKey, exportSave(next));
  }

  const value = useMemo<GameContextValue>(() => ({
    save,
    markQuestCleared: (questId) => {
      const clearedQuestIds = save.progress.clearedQuestIds.includes(questId) ? save.progress.clearedQuestIds : [...save.progress.clearedQuestIds, questId];
      persist({ ...save, updatedAt: now(), progress: { ...save.progress, clearedQuestIds } });
    },
    startSweep: (questId, count) => {
      const quest = initialQuests.find((candidate) => candidate.id === questId);
      if (!quest) throw new Error('副本不存在');
      if (!save.progress.clearedQuestIds.includes(questId)) throw new Error('副本未首通');
      persist({ ...save, updatedAt: now(), activeRun: createSweepRun({ quest, requestedRuns: count, startedAt: now(), sweepEfficiency: 0 }) });
    },
    exportCurrentSave: () => exportSave(save),
    importSaveJson: (json) => persist(importSave(json))
  }), [save]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside GameProvider');
  return value;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
npm test -- src/state/gameStore.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/state/gameStore.tsx src/state/gameStore.test.tsx
git commit -m "feat: add game state store"
```

## Task 8: 实现手机优先 UI Shell 和五个导航入口

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/ui/AppShell.tsx`
- Create: `src/ui/screens/ExpeditionScreen.tsx`
- Create: `src/ui/screens/FormationScreen.tsx`
- Create: `src/ui/screens/UpgradeScreen.tsx`
- Create: `src/ui/screens/GachaScreen.tsx`
- Create: `src/ui/screens/InventoryScreen.tsx`
- Test: `src/ui/AppShell.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `src/ui/AppShell.test.tsx`:

```tsx
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
      </GameProvider>
    );

    expect(screen.getByRole('heading', { name: '远征' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '编成' }));
    expect(screen.getByRole('heading', { name: '编成' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '仓库' }));
    expect(screen.getByRole('heading', { name: '仓库' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- src/ui/AppShell.test.tsx
```

Expected: FAIL，提示 UI 模块不存在。

- [ ] **Step 3: 实现 AppShell**

Create `src/ui/AppShell.tsx`:

```tsx
import { Boxes, Gem, Map, Shield, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ExpeditionScreen } from './screens/ExpeditionScreen';
import { FormationScreen } from './screens/FormationScreen';
import { UpgradeScreen } from './screens/UpgradeScreen';
import { GachaScreen } from './screens/GachaScreen';
import { InventoryScreen } from './screens/InventoryScreen';

type TabId = 'expedition' | 'formation' | 'upgrade' | 'gacha' | 'inventory';

const tabs = [
  { id: 'expedition' as const, label: '远征', icon: Map, screen: ExpeditionScreen },
  { id: 'formation' as const, label: '编成', icon: Shield, screen: FormationScreen },
  { id: 'upgrade' as const, label: '强化', icon: Sparkles, screen: UpgradeScreen },
  { id: 'gacha' as const, label: '抽卡', icon: Gem, screen: GachaScreen },
  { id: 'inventory' as const, label: '仓库', icon: Boxes, screen: InventoryScreen }
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('expedition');
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const Screen = active.screen;

  return (
    <div className="shell">
      <section className="screen">
        <Screen />
      </section>
      <nav className="bottom-nav" aria-label="主导航">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={tab.id === activeTab ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setActiveTab(tab.id)} aria-label={tab.label}>
              <Icon aria-hidden="true" size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: 创建五个基础页面**

Each screen should export one component and one `h1` with the tab name. Start with concise real content, not marketing text.

Example `src/ui/screens/ExpeditionScreen.tsx`:

```tsx
import { initialQuests } from '../../domain/content';
import { useGame } from '../../state/gameStore';

export function ExpeditionScreen() {
  const { save } = useGame();
  const currentQuest = initialQuests.find((quest) => !save.progress.clearedQuestIds.includes(quest.id)) ?? initialQuests[initialQuests.length - 1];

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">当前目标</p>
        <h1>远征</h1>
      </header>
      <section className="panel">
        <h2>{currentQuest.name}</h2>
        <p>单次耗时 {Math.round(currentQuest.runDurationMs / 60_000)} 分钟</p>
      </section>
    </div>
  );
}
```

Create the other screens with matching headings:

```tsx
export function FormationScreen() {
  return <div className="page"><header className="page-header"><p className="eyebrow">火队</p><h1>编成</h1></header></div>;
}

export function UpgradeScreen() {
  return <div className="page"><header className="page-header"><p className="eyebrow">成长</p><h1>强化</h1></header></div>;
}

export function GachaScreen() {
  return <div className="page"><header className="page-header"><p className="eyebrow">星炉常驻池</p><h1>抽卡</h1></header></div>;
}

export function InventoryScreen() {
  return <div className="page"><header className="page-header"><p className="eyebrow">本地存档</p><h1>仓库</h1></header></div>;
}
```

- [ ] **Step 5: 接入 App 和样式**

Modify `src/App.tsx`:

```tsx
import { GameProvider } from './state/gameStore';
import { AppShell } from './ui/AppShell';

export function App() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}
```

Append to `src/styles.css`:

```css
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: 1fr auto;
  background: #10131a;
}

.screen {
  min-width: 0;
  padding: 18px 14px 88px;
}

.page {
  max-width: 720px;
  margin: 0 auto;
}

.page-header {
  display: grid;
  gap: 4px;
  margin-bottom: 16px;
}

.eyebrow {
  margin: 0;
  color: #8bd3c7;
  font-size: 0.78rem;
}

h1,
h2,
p {
  margin-top: 0;
}

.panel {
  border: 1px solid #2a3140;
  border-radius: 8px;
  padding: 14px;
  background: #171c26;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: 8px 8px max(8px, env(safe-area-inset-bottom));
  background: #0b0e13;
  border-top: 1px solid #222936;
}

.nav-button {
  display: grid;
  justify-items: center;
  gap: 3px;
  min-height: 54px;
  padding: 6px 2px;
  color: #9ca8ba;
  background: transparent;
  border: 0;
}

.nav-button span {
  font-size: 0.72rem;
}

.nav-button.active {
  color: #f5c86a;
}
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```powershell
npm test -- src/ui/AppShell.test.tsx
```

Expected: PASS。

- [ ] **Step 7: 提交**

```powershell
git add src/App.tsx src/styles.css src/ui src/ui/AppShell.test.tsx
git commit -m "feat: add mobile app shell"
```

## Task 9: 接入核心玩法页面

**Files:**
- Modify: `src/ui/screens/ExpeditionScreen.tsx`
- Modify: `src/ui/screens/FormationScreen.tsx`
- Modify: `src/ui/screens/UpgradeScreen.tsx`
- Modify: `src/ui/screens/GachaScreen.tsx`
- Modify: `src/ui/screens/InventoryScreen.tsx`
- Create: `src/ui/components/BattleLog.tsx`
- Create: `src/ui/components/StatBreakdown.tsx`
- Create: `src/ui/components/RewardSummary.tsx`
- Create: `src/ui/components/IconBadge.tsx`
- Test: `src/ui/mvpScreens.test.tsx`

- [ ] **Step 1: 写 UI 流程失败测试**

Create `src/ui/mvpScreens.test.tsx`:

```tsx
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
      </GameProvider>
    );

    expect(screen.getByRole('button', { name: '开始首通' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '编成' }));
    expect(screen.getByText('通常攻刃')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '抽卡' }));
    expect(screen.getByRole('button', { name: '单抽' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '仓库' }));
    expect(screen.getByRole('button', { name: '导出存档' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- src/ui/mvpScreens.test.tsx
```

Expected: FAIL，提示按钮或文本不存在。

- [ ] **Step 3: 创建展示组件**

Create `BattleLog.tsx`, `StatBreakdown.tsx`, `RewardSummary.tsx`, and `IconBadge.tsx` with focused props:

```tsx
export function BattleLog({ lines }: { lines: string[] }) {
  return <ol className="log-list">{lines.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol>;
}
```

```tsx
export function StatBreakdown({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return <dl className="stat-breakdown">{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>;
}
```

```tsx
export function RewardSummary({ rewards }: { rewards: Array<{ itemId: string; quantity: number }> }) {
  return <ul className="reward-list">{rewards.map((reward) => <li key={reward.itemId}>{reward.itemId} x{reward.quantity}</li>)}</ul>;
}
```

```tsx
export function IconBadge({ label }: { label: string }) {
  return <span className="icon-badge" aria-label={label}>{label.slice(0, 1)}</span>;
}
```

- [ ] **Step 4: 扩展页面行为**

Implement these concrete page behaviors:

- `ExpeditionScreen`: show current uncleared quest, "开始首通" button, "开始扫荡" button if cleared, repeat count input capped by store/domain, active sweep status.
- `FormationScreen`: show four characters, current weapons, summons, and static breakdown labels `通常攻刃`、`方阵攻刃`、`EX 攻刃`、`属性攻击`、`连击/奥义槽`.
- `UpgradeScreen`: show character list and weapon list with disabled/enabled upgrade buttons based on materials.
- `GachaScreen`: show crystal/ticket count, "单抽" and "十连" buttons, last pull results.
- `InventoryScreen`: show materials/currencies, "导出存档" button, textarea for import, "导入存档" button, asset mode label `发布模式：原创/占位素材`.

Use existing domain functions. Do not add new core rules inside components.

- [ ] **Step 5: 补充样式**

Append CSS classes:

```css
.actions,
.row-list,
.reward-list,
.log-list {
  display: grid;
  gap: 10px;
}

.actions {
  grid-template-columns: 1fr 1fr;
}

.primary-button,
.secondary-button {
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid #384253;
  color: #10131a;
  background: #f5c86a;
}

.secondary-button {
  color: #eef2ff;
  background: #202838;
}

.stat-breakdown {
  display: grid;
  gap: 8px;
}

.stat-breakdown div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.icon-badge {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #10131a;
  background: #8bd3c7;
}
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```powershell
npm test -- src/ui/mvpScreens.test.tsx
```

Expected: PASS。

- [ ] **Step 7: 提交**

```powershell
git add src/ui src/styles.css
git commit -m "feat: connect mvp gameplay screens"
```

## Task 10: 端到端验证、构建验证和文档收尾

**Files:**
- Create: `tests/e2e/mvp-flow.spec.ts`
- Create: `playwright.config.ts`
- Modify: `README.md`

- [ ] **Step 1: 配置 Playwright**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...devices['Pixel 5']
  }
});
```

- [ ] **Step 2: 写 E2E 测试**

Create `tests/e2e/mvp-flow.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('mobile mvp flow exposes core screens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '远征' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始首通' })).toBeVisible();

  await page.getByRole('button', { name: '编成' }).click();
  await expect(page.getByText('连击/奥义槽')).toBeVisible();

  await page.getByRole('button', { name: '抽卡' }).click();
  await expect(page.getByRole('button', { name: '单抽' })).toBeVisible();

  await page.getByRole('button', { name: '仓库' }).click();
  await expect(page.getByRole('button', { name: '导出存档' })).toBeVisible();
});
```

- [ ] **Step 3: 创建 README**

Create `README.md`:

```md
# Idle GBF

手机优先的本地 PWA 放置 RPG 原型。玩法目标是 Whipper 风格远征周回，加上 GBF 风格的武器盘、召唤石、词条和奥义构筑。

## 开发

```powershell
npm install
npm run dev
```

## 验证

```powershell
npm test
npm run build
npm run e2e
```

## 素材边界

项目不提交、不打包、不再分发 Granblue Fantasy 或 Cygames 素材。开发/本地模式可以通过 asset key 映射到本地资源；发布模式使用原创或占位素材。
```

- [ ] **Step 4: 运行完整验证**

Run:

```powershell
npm test
npm run build
npm run e2e
```

Expected: all commands exit code 0。

- [ ] **Step 5: 启动开发服务器供用户体验**

Run:

```powershell
npm run dev -- --port 5173
```

Expected: Vite prints `http://127.0.0.1:5173/` or another available local URL. Leave the server running until the user has the URL.

- [ ] **Step 6: 提交**

```powershell
git add README.md playwright.config.ts tests public src package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html
git commit -m "test: verify mvp flow"
```

## 自查清单

- 规格覆盖：火队路线、首通、扫荡、100 次上限、5 到 10 分钟耗时、普通攻击/奥义、两个被动、词条分区、连击与奥义槽、抽卡、存档、素材边界、手机 UI 都有对应任务。
- 不做范围：主动技能、高难机制、六属性全内容、联网账号、付费系统、GBF 素材再分发没有进入实现任务。
- 类型一致性：内容数据使用 `types.ts` 中的 ID 和类型；战斗、远征、存档、状态层都引用同一套 `Quest`、`PartyLoadout`、`SaveFile` 概念。
- 验证路径：每个领域模块先写失败测试，再实现，再通过测试；最后用 `npm test`、`npm run build`、`npm run e2e` 做整体验证。
