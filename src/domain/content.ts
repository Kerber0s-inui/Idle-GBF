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
        description: '提升普通攻刃。',
        modifiers: [
          {
            id: 'mod-leya-normal-atk',
            label: '普通攻刃 +8%',
            type: 'attack',
            value: 0.08,
            category: 'normal',
            source: 'character',
          },
        ],
      },
      {
        id: 'passive-leya-charge-loop',
        name: '赤轨回流',
        description: '提升奥义充能效率。',
        modifiers: [
          {
            id: 'mod-leya-charge-gain',
            label: '奥义获得量 +10%',
            type: 'chargeGain',
            value: 0.1,
            source: 'character',
          },
        ],
      },
    ],
    chargeAttack: { id: 'ca-leya', name: '赤轨断层', multiplier: 4.5, chargeCost: 100, cap: 1160000 },
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
        description: '提升防御力。',
        modifiers: [
          {
            id: 'mod-caro-defense',
            label: '防御 +10%',
            type: 'defense',
            value: 0.1,
            source: 'character',
          },
        ],
      },
      {
        id: 'passive-caro-hp',
        name: '炉压稳定',
        description: '提升最大 HP。',
        modifiers: [
          {
            id: 'mod-caro-hp',
            label: '普通守护 +8%',
            type: 'hp',
            value: 0.08,
            category: 'normal',
            source: 'character',
          },
        ],
      },
    ],
    chargeAttack: { id: 'ca-caro', name: '炉心重击', multiplier: 3.8, chargeCost: 100, cap: 920000 },
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
        description: '提升暴击率。',
        modifiers: [
          {
            id: 'mod-mira-crit-rate',
            label: '暴击率 +12%',
            type: 'criticalRate',
            value: 0.12,
            source: 'character',
          },
        ],
      },
      {
        id: 'passive-mira-ca-cap',
        name: '回路过载',
        description: '提升奥义伤害上限。',
        modifiers: [
          {
            id: 'mod-mira-ca-cap',
            label: '奥义上限 +8%',
            type: 'chargeCap',
            value: 0.08,
            source: 'character',
          },
        ],
      },
    ],
    chargeAttack: { id: 'ca-mira', name: '星火协议', multiplier: 4.7, chargeCost: 100, cap: 1220000 },
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
        description: '提升连击率。',
        modifiers: [
          {
            id: 'mod-noin-da',
            label: 'DA 率 +10%',
            type: 'doubleAttackRate',
            value: 0.1,
            source: 'character',
          },
        ],
      },
      {
        id: 'passive-noin-drop',
        name: '残响检索',
        description: '提升掉落率。',
        modifiers: [
          {
            id: 'mod-noin-drop',
            label: '掉落率 +5%',
            type: 'dropRate',
            value: 0.05,
            source: 'character',
          },
        ],
      },
    ],
    chargeAttack: { id: 'ca-noin', name: '灰烬脉冲', multiplier: 3.9, chargeCost: 100, cap: 940000 },
  },
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
    skills: [
      {
        id: 'skill-red-rail-normal',
        name: '赤轨攻刃',
        level: 1,
        modifiers: [
          {
            id: 'mod-red-rail-normal',
            label: '普通攻刃 +8%',
            type: 'attack',
            value: 0.08,
            category: 'normal',
            source: 'weapon',
          },
        ],
      },
    ],
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
    skills: [
      {
        id: 'skill-furnace-magna',
        name: '炉心方阵攻刃',
        level: 1,
        modifiers: [
          {
            id: 'mod-furnace-magna',
            label: '方阵攻刃 +7%',
            type: 'attack',
            value: 0.07,
            category: 'magna',
            source: 'weapon',
          },
        ],
      },
    ],
  },
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
    assetKey: 'summon/helios-engine',
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
    assetKey: 'summon/aurora-core',
  },
];

export const initialEnemies: Enemy[] = [
  {
    id: 'enemy-wind-sentinel-1',
    name: '风蚀守卫 I',
    element: 'wind',
    stats: { hp: 48000, atk: 520, defense: 100 },
    normalAttackDamage: 260,
    assetKey: 'enemy/wind-sentinel-1',
  },
  {
    id: 'enemy-wind-sentinel-2',
    name: '风蚀守卫 II',
    element: 'wind',
    stats: { hp: 118000, atk: 980, defense: 112 },
    normalAttackDamage: 540,
    assetKey: 'enemy/wind-sentinel-2',
  },
  {
    id: 'enemy-wind-sentinel-3',
    name: '风蚀守卫 III',
    element: 'wind',
    stats: { hp: 260000, atk: 1650, defense: 125 },
    normalAttackDamage: 940,
    assetKey: 'enemy/wind-sentinel-3',
  },
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
    dropTable: [{ itemId: 'weapon-furnace-grid-blade', kind: 'weapon', quantity: 1, chance: 0.08 }],
  },
  {
    id: 'quest-main-2',
    name: '主线 2：裂风回廊',
    element: 'wind',
    difficulty: 2,
    runDurationMs: 7 * 60_000,
    enemyId: 'enemy-wind-sentinel-2',
    unlockAfterQuestId: 'quest-main-1',
    firstClearRewards: [{ itemId: 'gacha-ticket', kind: 'ticket', quantity: 1, chance: 1 }],
    dropTable: [{ itemId: 'weapon-furnace-grid-blade', kind: 'weapon', quantity: 1, chance: 0.12 }],
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
    dropTable: [{ itemId: 'summon-helios-engine', kind: 'summon', quantity: 1, chance: 0.03 }],
  },
];
