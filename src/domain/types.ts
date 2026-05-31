export type Element = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';

export type Rarity = 'R' | 'SR' | 'SSR';

export type WeaponSource = 'story' | 'farmable' | 'gacha';

export type SkillCategory = 'normal' | 'magna' | 'ex' | 'elemental' | 'independent';

export type AttackKind = 'normalAttack' | 'chargeAttack';

export type AssetMode = 'local-gbfal' | 'release-placeholder';

export type QuestKind = 'main' | 'boss' | 'material';

export type RewardKind =
  | 'material'
  | 'weapon'
  | 'summon'
  | 'currency'
  | 'characterExp'
  | 'weaponExpMaterial'
  | 'summonExpMaterial'
  | 'weaponSkillMaterial'
  | 'characterUncapMaterial'
  | 'weaponUncapMaterial'
  | 'summonUncapMaterial';

export type Modifier = {
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
};

export type StatBlock = {
  hp: number;
  atk: number;
  defense: number;
};

export type Passive = {
  id: string;
  name: string;
  description: string;
  modifiers: Modifier[];
};

export type PassiveUnlockRule = {
  uncap: number;
  level?: number;
};

export type ProgressionRule = {
  baseLevelCap: number;
  normalUncapCount: number;
  normalUncapStep: number;
  normalMaxLevelCap: number;
  transcendenceEnabled?: boolean;
  transcendenceStepCount?: number;
  transcendenceCapStep?: number;
  finalLevelCap: number;
};

export type CharacterProgressionRule = ProgressionRule & {
  passiveUnlocks: [PassiveUnlockRule, PassiveUnlockRule];
};

export type WeaponProgressionRule = ProgressionRule & {
  baseSkillCap: number;
  maxUncapSkillCap: number;
};

export type SummonProgressionRule = ProgressionRule;

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
  level: number;
  maxLevel: number;
  stats: StatBlock;
  assetKey: string;
  assetMode?: AssetMode;
  passives: [Passive, Passive];
  bondTags?: string[];
  progression?: Partial<CharacterProgressionRule>;
  chargeAttack: ChargeAttack;
};

export type WeaponSkill = {
  id: string;
  name: string;
  level: number;
  modifiers: Modifier[];
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
  progression?: Partial<WeaponProgressionRule>;
};

export type Summon = {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  stats: StatBlock;
  aura: {
    label: string;
    target: SkillCategory;
    boost: number;
  };
  assetKey: string;
  assetMode?: AssetMode;
  progression?: Partial<SummonProgressionRule>;
};

export type Enemy = {
  id: string;
  name: string;
  element: Element;
  stats: StatBlock;
  normalAttackDamage: number;
  assetKey: string;
  assetMode?: AssetMode;
  chargeMax?: number;
  specialActions?: EnemySpecialAction[];
};

export type EnemySpecialTrigger = { kind: 'hpThreshold'; threshold: number } | { kind: 'chargeFull' };

export type EnemySpecialTarget = { kind: 'single' } | { kind: 'all' } | { kind: 'randomN'; count: number };

export type EnemySpecialAction = {
  id: string;
  name: string;
  trigger: EnemySpecialTrigger;
  target: EnemySpecialTarget;
  damageMultiplier: number;
};

export type RewardTableEntry = {
  itemId: string;
  kind: RewardKind;
  quantity: number;
  chance: number;
};

export type Quest = {
  id: string;
  name: string;
  kind: QuestKind;
  element: Element;
  difficulty: number;
  runDurationMs: number;
  enemyId: string;
  unlockAfterQuestId?: string;
  firstClearRewards: RewardTableEntry[];
  dropTable: RewardTableEntry[];
};

export type WeaponGrid = {
  mainWeaponId: string;
  weaponIds: string[];
};

export type PartyLoadout = {
  characterIds: string[];
  weaponGrid: WeaponGrid;
  mainSummonId: string;
  summonIds?: string[];
  supportSummonId?: string;
};
