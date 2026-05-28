export type Element = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';

export type Rarity = 'R' | 'SR' | 'SSR';

export type WeaponSource = 'story' | 'farmable' | 'gacha' | 'event';

export type SkillCategory = 'normal' | 'magna' | 'elemental' | 'unknown' | 'ex';

export type AttackKind = 'normal' | 'charge';

export type AssetMode = 'static' | 'animated';

export type Modifier = {
  id: string;
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
  source: 'character' | 'weapon' | 'summon' | 'quest' | 'system';
};

export type StatBlock = {
  hp: number;
  atk: number;
  defense: number;
};

export type Passive = {
  id: string;
  name: string;
  modifier: Modifier;
};

export type ChargeAttack = {
  id: string;
  name: string;
  multiplier: number;
  chargeCost: number;
  cap: number;
};

export type Character = {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  stats: StatBlock;
  assetKey: string;
  assetMode?: AssetMode;
  passives: Passive[];
  chargeAttack: ChargeAttack;
};

export type WeaponSkill = {
  id: string;
  name: string;
  modifier: Modifier;
};

export type Weapon = {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  source: WeaponSource;
  level: number;
  maxLevel: number;
  stats: StatBlock;
  assetKey: string;
  assetMode?: AssetMode;
  skills: WeaponSkill[];
};

export type Summon = {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  stats: StatBlock;
  aura: {
    label: string;
    target: SkillCategory;
    boost: number;
  };
  assetKey: string;
  assetMode?: AssetMode;
};

export type Enemy = {
  id: string;
  name: string;
  element: Element;
  stats: StatBlock;
  normalAttackDamage: number;
  assetKey: string;
  assetMode?: AssetMode;
};

export type RewardTableEntry = {
  itemId: string;
  chance: number;
};

export type Quest = {
  id: string;
  name: string;
  element: Element;
  difficulty: number;
  runDurationMs: number;
  enemyId: string;
  unlockAfterQuestId?: string;
  firstClear: {
    itemId: string;
    quantity: number;
  };
  drops: RewardTableEntry[];
};

export type WeaponGrid = {
  mainHandWeaponId: string;
  weaponIds: string[];
};

export type PartyLoadout = {
  characterIds: string[];
  weaponGrid: WeaponGrid;
  summonId: string;
};
