export type FormationSlotKind = 'weapon' | 'summon' | 'empty';

export type FormationSlotRole = 'main' | 'sub';

export interface FormationSlot {
  index: number;
  role: FormationSlotRole;
  kind: FormationSlotKind;
  itemId: string | null;
}

export interface WeaponGridFormation {
  mainWeaponId: string | null;
  slots: FormationSlot[];
}

export interface SummonGridFormation {
  mainSummonId: string | null;
  slots: FormationSlot[];
}

function createSlots(input: { itemIds: string[]; size: number; filledKind: Exclude<FormationSlotKind, 'empty'> }) {
  return Array.from({ length: input.size }, (_, index): FormationSlot => {
    const itemId = input.itemIds[index] ?? null;

    return {
      index,
      role: index === 0 ? 'main' : 'sub',
      kind: itemId ? input.filledKind : 'empty',
      itemId,
    };
  });
}

export function createWeaponGrid(weaponIds: string[]): WeaponGridFormation {
  const itemIds = weaponIds.slice(0, 10);

  return {
    mainWeaponId: itemIds[0] ?? null,
    slots: createSlots({ itemIds, size: 10, filledKind: 'weapon' }),
  };
}

export function createSummonGrid(summonIds: string[]): SummonGridFormation {
  const itemIds = summonIds.slice(0, 5);

  return {
    mainSummonId: itemIds[0] ?? null,
    slots: createSlots({ itemIds, size: 5, filledKind: 'summon' }),
  };
}
