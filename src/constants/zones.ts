export const ZONES = {
  A: ['A1', 'A2', 'A3'],
  B: ['B1', 'B2', 'B3'],
  C: ['C1', 'C2', 'C3'],
} as const;

export const ALL_SUB_ZONES = [...ZONES.A, ...ZONES.B, ...ZONES.C];

export const CATEGORIES = ['ไฟฟ้า', 'Accessory', 'อิเล็กทรอนิกส์', 'พลาสติก'] as const;

export const getMainZone = (subZone: string): string => subZone[0];
