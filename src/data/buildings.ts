export type BuildingType =
  | 'extractor'
  | 'workshop'
  | 'furnace'
  | 'machine_shop'
  | 'industrial_factory'
  | 'manufacturer'
  | 'earth_teleporter'
  | 'forge';

export interface BuildingInfo {
  id: BuildingType;
  name: string;
  maxLevel: number;
  speedMultipliers: number[];
}

// Speed multipliers for levels 1-5
const STANDARD_MULTIPLIERS = [1, 1.5, 2, 3, 4];

// Extractor output rates per minute for levels 1-5
export const EXTRACTOR_RATES = [7.5, 11.25, 15, 22.5, 30];

export const BUILDINGS: Record<BuildingType, BuildingInfo> = {
  extractor: {
    id: 'extractor',
    name: 'Extractor',
    maxLevel: 5,
    speedMultipliers: EXTRACTOR_RATES.map(r => r / EXTRACTOR_RATES[0]),
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
  },
  furnace: {
    id: 'furnace',
    name: 'Furnace',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
  },
  machine_shop: {
    id: 'machine_shop',
    name: 'Machine Shop',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
  },
  industrial_factory: {
    id: 'industrial_factory',
    name: 'Industrial Factory',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
  },
  manufacturer: {
    id: 'manufacturer',
    name: 'Manufacturer',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
  },
  earth_teleporter: {
    id: 'earth_teleporter',
    name: 'Earth Teleporter',
    maxLevel: 1,
    speedMultipliers: [1],
  },
};

export function getBuildingMultiplier(building: BuildingType, level: number): number {
  const info = BUILDINGS[building];
  const idx = Math.min(level, info.maxLevel) - 1;
  return info.speedMultipliers[idx];
}
