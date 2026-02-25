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
  powerConsumption: number[]; // watts per building at each level (placeholder values)
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
    powerConsumption: [10, 15, 20, 30, 40],
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
    powerConsumption: [5, 8, 10, 15, 20],
  },
  furnace: {
    id: 'furnace',
    name: 'Furnace',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
    powerConsumption: [15, 22, 30, 45, 60],
  },
  machine_shop: {
    id: 'machine_shop',
    name: 'Machine Shop',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
    powerConsumption: [20, 30, 40, 60, 80],
  },
  industrial_factory: {
    id: 'industrial_factory',
    name: 'Industrial Factory',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
    powerConsumption: [30, 45, 60, 90, 120],
  },
  manufacturer: {
    id: 'manufacturer',
    name: 'Manufacturer',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
    powerConsumption: [40, 60, 80, 120, 160],
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    maxLevel: 5,
    speedMultipliers: STANDARD_MULTIPLIERS,
    powerConsumption: [50, 75, 100, 150, 200],
  },
  earth_teleporter: {
    id: 'earth_teleporter',
    name: 'Earth Teleporter',
    maxLevel: 1,
    speedMultipliers: [1],
    powerConsumption: [100],
  },
};

export function getBuildingMultiplier(building: BuildingType, level: number): number {
  const info = BUILDINGS[building];
  const idx = Math.min(level, info.maxLevel) - 1;
  return info.speedMultipliers[idx];
}
