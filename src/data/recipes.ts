import { BuildingType } from './buildings';

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  outputId: string;
  outputQuantity: number;
  building: BuildingType;
  craftTime: number; // seconds at level 1
  ingredients: RecipeIngredient[];
  isAlternate: boolean;
  alternateName?: string;
}

// Default recipes for all items
const DEFAULT_RECIPES: Recipe[] = [
  // Workshop - basic processing
  {
    id: 'wood_plank',
    outputId: 'wood_plank',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 1,
    ingredients: [{ itemId: 'wood_log', quantity: 1 }],
    isAlternate: false,
  },
  {
    id: 'sand',
    outputId: 'sand',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 1.5,
    ingredients: [{ itemId: 'stone', quantity: 1 }],
    isAlternate: false,
  },
  {
    id: 'copper_wire',
    outputId: 'copper_wire',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 2,
    ingredients: [{ itemId: 'copper_ingot', quantity: 1.5 }],
    isAlternate: false,
  },
  {
    id: 'iron_gear',
    outputId: 'iron_gear',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 4,
    ingredients: [{ itemId: 'iron_ingot', quantity: 2 }],
    isAlternate: false,
  },
  {
    id: 'iron_plating',
    outputId: 'iron_plating',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 3,
    ingredients: [{ itemId: 'iron_ingot', quantity: 2 }],
    isAlternate: false,
  },
  {
    id: 'heat_sink',
    outputId: 'heat_sink',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 6,
    ingredients: [{ itemId: 'copper_ingot', quantity: 5 }],
    isAlternate: false,
  },
  {
    id: 'steel_rod',
    outputId: 'steel_rod',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 4,
    ingredients: [{ itemId: 'steel', quantity: 3 }],
    isAlternate: false,
  },
  {
    id: 'steel_plating',
    outputId: 'steel_plating',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 5,
    ingredients: [{ itemId: 'steel', quantity: 4 }],
    isAlternate: false,
  },
  {
    id: 'wood_frame',
    outputId: 'wood_frame',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 8,
    ingredients: [{ itemId: 'wood_plank', quantity: 4 }],
    isAlternate: false,
  },
  {
    id: 'condenser_lens',
    outputId: 'condenser_lens',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 3,
    ingredients: [{ itemId: 'glass', quantity: 3 }],
    isAlternate: false,
  },
  {
    id: 'carbon_fiber',
    outputId: 'carbon_fiber',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 8,
    ingredients: [{ itemId: 'graphite', quantity: 4 }],
    isAlternate: false,
  },
  {
    id: 'particle_glue',
    outputId: 'particle_glue',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 3,
    ingredients: [{ itemId: 'matter_compressor', quantity: 0.1 }],
    isAlternate: false,
  },
  {
    id: 'aluminum_rod',
    outputId: 'aluminum_rod',
    outputQuantity: 2,
    building: 'workshop',
    craftTime: 3,
    ingredients: [{ itemId: 'aluminum_ingot', quantity: 1 }],
    isAlternate: false,
  },
  {
    id: 'aluminum_sheet',
    outputId: 'aluminum_sheet',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 4,
    ingredients: [{ itemId: 'aluminum_ingot', quantity: 2 }],
    isAlternate: false,
  },

  // Furnace
  {
    id: 'iron_ingot',
    outputId: 'iron_ingot',
    outputQuantity: 1,
    building: 'furnace',
    craftTime: 2,
    ingredients: [{ itemId: 'iron_ore', quantity: 1 }],
    isAlternate: false,
  },
  {
    id: 'copper_ingot',
    outputId: 'copper_ingot',
    outputQuantity: 1,
    building: 'furnace',
    craftTime: 2,
    ingredients: [{ itemId: 'copper_ore', quantity: 1 }],
    isAlternate: false,
  },
  {
    id: 'glass',
    outputId: 'glass',
    outputQuantity: 1,
    building: 'furnace',
    craftTime: 6,
    ingredients: [{ itemId: 'sand', quantity: 4 }],
    isAlternate: false,
  },
  {
    id: 'silicon',
    outputId: 'silicon',
    outputQuantity: 1,
    building: 'furnace',
    craftTime: 3,
    ingredients: [{ itemId: 'sand', quantity: 2 }],
    isAlternate: false,
  },
  {
    id: 'tungsten_ore',
    outputId: 'tungsten_ore',
    outputQuantity: 1,
    building: 'furnace',
    craftTime: 2.5,
    ingredients: [{ itemId: 'wolframite', quantity: 5 }],
    isAlternate: false,
  },
  {
    id: 'gold_ingot',
    outputId: 'gold_ingot',
    outputQuantity: 1,
    building: 'furnace',
    craftTime: 5,
    ingredients: [{ itemId: 'gold_ore', quantity: 1 }],
    isAlternate: false,
  },
  {
    id: 'tungsten_ingot',
    outputId: 'tungsten_ingot',
    outputQuantity: 1,
    building: 'furnace',
    craftTime: 5,
    ingredients: [{ itemId: 'tungsten_ore', quantity: 1 }],
    isAlternate: false,
  },
  {
    id: 'alumina',
    outputId: 'alumina',
    outputQuantity: 1,
    building: 'furnace',
    craftTime: 3,
    ingredients: [{ itemId: 'sand', quantity: 3 }],
    isAlternate: false,
  },

  // Forge
  {
    id: 'graphite',
    outputId: 'graphite',
    outputQuantity: 1,
    building: 'forge',
    craftTime: 4,
    ingredients: [
      { itemId: 'wood_log', quantity: 3 },
      { itemId: 'coal', quantity: 3 },
    ],
    isAlternate: false,
  },
  {
    id: 'steel',
    outputId: 'steel',
    outputQuantity: 1,
    building: 'forge',
    craftTime: 8,
    ingredients: [
      { itemId: 'iron_ore', quantity: 6 },
      { itemId: 'graphite', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'tungsten_carbide',
    outputId: 'tungsten_carbide',
    outputQuantity: 1,
    building: 'forge',
    craftTime: 5,
    ingredients: [
      { itemId: 'tungsten_ore', quantity: 2 },
      { itemId: 'graphite', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'concrete',
    outputId: 'concrete',
    outputQuantity: 1,
    building: 'forge',
    craftTime: 8,
    ingredients: [
      { itemId: 'sand', quantity: 10 },
      { itemId: 'steel_rod', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'aluminum_ingot',
    outputId: 'aluminum_ingot',
    outputQuantity: 1,
    building: 'forge',
    craftTime: 5,
    ingredients: [{ itemId: 'alumina', quantity: 2 }],
    isAlternate: false,
  },

  // Machine Shop
  {
    id: 'electromagnet',
    outputId: 'electromagnet',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 8,
    ingredients: [
      { itemId: 'copper_wire', quantity: 6 },
      { itemId: 'iron_ingot', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'logic_circuit',
    outputId: 'logic_circuit',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 4,
    ingredients: [
      { itemId: 'copper_wire', quantity: 3 },
      { itemId: 'silicon', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'battery',
    outputId: 'battery',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 24,
    ingredients: [
      { itemId: 'electromagnet', quantity: 8 },
      { itemId: 'graphite', quantity: 8 },
    ],
    isAlternate: false,
  },
  {
    id: 'rotor',
    outputId: 'rotor',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 6,
    ingredients: [
      { itemId: 'iron_plating', quantity: 2 },
      { itemId: 'steel_rod', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'coupler',
    outputId: 'coupler',
    outputQuantity: 1,
    building: 'workshop',
    craftTime: 10,
    ingredients: [{ itemId: 'tungsten_carbide', quantity: 1 }],
    isAlternate: false,
  },
  {
    id: 'condenser',
    outputId: 'condenser',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 3,
    ingredients: [
      { itemId: 'glass', quantity: 1 },
      { itemId: 'copper_wire', quantity: 4 },
    ],
    isAlternate: false,
  },
  {
    id: 'coil',
    outputId: 'coil',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 6,
    ingredients: [
      { itemId: 'steel', quantity: 2 },
      { itemId: 'copper_wire', quantity: 6 },
    ],
    isAlternate: false,
  },
  {
    id: 'nano_wire',
    outputId: 'nano_wire',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 12,
    ingredients: [
      { itemId: 'glass', quantity: 4 },
      { itemId: 'carbon_fiber', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'gyroscope',
    outputId: 'gyroscope',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 12,
    ingredients: [
      { itemId: 'copper_wire', quantity: 12 },
      { itemId: 'rotor', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'pump',
    outputId: 'pump',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 8,
    ingredients: [
      { itemId: 'tank', quantity: 1 },
      { itemId: 'rotor', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'metal_frame',
    outputId: 'metal_frame',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 12,
    ingredients: [
      { itemId: 'wood_frame', quantity: 1 },
      { itemId: 'iron_plating', quantity: 4 },
    ],
    isAlternate: false,
  },
  {
    id: 'energy_cube',
    outputId: 'energy_cube',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 30,
    ingredients: [
      { itemId: 'battery', quantity: 2 },
      { itemId: 'industrial_frame', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'quantum_entangler',
    outputId: 'quantum_entangler',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 60,
    ingredients: [
      { itemId: 'magnetic_field_generator', quantity: 1 },
      { itemId: 'stabilizer', quantity: 2 },
    ],
    isAlternate: false,
  },

  // Industrial Factory
  {
    id: 'computer',
    outputId: 'computer',
    outputQuantity: 1,
    building: 'industrial_factory',
    craftTime: 8,
    ingredients: [
      { itemId: 'heat_sink', quantity: 3 },
      { itemId: 'metal_frame', quantity: 1 },
      { itemId: 'logic_circuit', quantity: 3 },
    ],
    isAlternate: false,
  },
  {
    id: 'electric_motor',
    outputId: 'electric_motor',
    outputQuantity: 1,
    building: 'industrial_factory',
    craftTime: 20,
    ingredients: [
      { itemId: 'iron_gear', quantity: 4 },
      { itemId: 'rotor', quantity: 2 },
      { itemId: 'battery', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'industrial_frame',
    outputId: 'industrial_frame',
    outputQuantity: 1,
    building: 'industrial_factory',
    craftTime: 20,
    ingredients: [
      { itemId: 'concrete', quantity: 6 },
      { itemId: 'metal_frame', quantity: 2 },
      { itemId: 'tungsten_carbide', quantity: 8 },
    ],
    isAlternate: false,
  },
  {
    id: 'stabilizer',
    outputId: 'stabilizer',
    outputQuantity: 1,
    building: 'industrial_factory',
    craftTime: 24,
    ingredients: [
      { itemId: 'computer', quantity: 1 },
      { itemId: 'electric_motor', quantity: 1 },
      { itemId: 'gyroscope', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'tank',
    outputId: 'tank',
    outputQuantity: 1,
    building: 'industrial_factory',
    craftTime: 10,
    ingredients: [
      { itemId: 'concrete', quantity: 4 },
      { itemId: 'glass', quantity: 2 },
      { itemId: 'tungsten_carbide', quantity: 4 },
    ],
    isAlternate: false,
  },

  // Manufacturer
  {
    id: 'turbocharger',
    outputId: 'turbocharger',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 15,
    ingredients: [
      { itemId: 'iron_gear', quantity: 8 },
      { itemId: 'logic_circuit', quantity: 4 },
      { itemId: 'nano_wire', quantity: 2 },
      { itemId: 'coupler', quantity: 4 },
    ],
    isAlternate: false,
  },
  {
    id: 'motor_unit',
    outputId: 'motor_unit',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 20,
    ingredients: [
      { itemId: 'electric_motor', quantity: 4 },
      { itemId: 'rotor', quantity: 4 },
      { itemId: 'industrial_frame', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'super_computer',
    outputId: 'super_computer',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 30,
    ingredients: [
      { itemId: 'computer', quantity: 2 },
      { itemId: 'heat_sink', quantity: 8 },
      { itemId: 'turbocharger', quantity: 1 },
      { itemId: 'coupler', quantity: 8 },
    ],
    isAlternate: false,
  },
  {
    id: 'magnetic_field_generator',
    outputId: 'magnetic_field_generator',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 40,
    ingredients: [
      { itemId: 'electromagnet', quantity: 10 },
      { itemId: 'industrial_frame', quantity: 1 },
      { itemId: 'nano_wire', quantity: 10 },
      { itemId: 'stabilizer', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'matter_compressor',
    outputId: 'matter_compressor',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 30,
    ingredients: [
      { itemId: 'electric_motor', quantity: 2 },
      { itemId: 'tank', quantity: 1 },
      { itemId: 'turbocharger', quantity: 2 },
      { itemId: 'industrial_frame', quantity: 1 },
    ],
    isAlternate: false,
  },
  {
    id: 'electron_microscope',
    outputId: 'electron_microscope',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 24,
    ingredients: [
      { itemId: 'condenser_lens', quantity: 4 },
      { itemId: 'electromagnet', quantity: 8 },
      { itemId: 'metal_frame', quantity: 2 },
      { itemId: 'nano_wire', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'atomic_locator',
    outputId: 'atomic_locator',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 30,
    ingredients: [
      { itemId: 'concrete', quantity: 24 },
      { itemId: 'copper_wire', quantity: 50 },
      { itemId: 'electron_microscope', quantity: 2 },
      { itemId: 'super_computer', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'matter_duplicator',
    outputId: 'matter_duplicator',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 90,
    ingredients: [
      { itemId: 'atomic_locator', quantity: 4 },
      { itemId: 'energy_cube', quantity: 5 },
      { itemId: 'particle_glue', quantity: 100 },
      { itemId: 'quantum_entangler', quantity: 2 },
    ],
    isAlternate: false,
  },
  {
    id: 'empty_earth_token',
    outputId: 'empty_earth_token',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 10,
    ingredients: [
      { itemId: 'gold_ingot', quantity: 4 },
      { itemId: 'logic_circuit', quantity: 4 },
      { itemId: 'tungsten_carbide', quantity: 1 },
    ],
    isAlternate: false,
  },

  // Machine Shop - Empty Fuel Cell
  {
    id: 'empty_fuel_cell',
    outputId: 'empty_fuel_cell',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 15,
    ingredients: [
      { itemId: 'tungsten_carbide', quantity: 3 },
      { itemId: 'glass', quantity: 5 },
    ],
    isAlternate: false,
  },

  // Earth Teleporter
  {
    id: 'earth_token',
    outputId: 'earth_token',
    outputQuantity: 1,
    building: 'earth_teleporter',
    craftTime: 42,
    ingredients: [{ itemId: 'matter_duplicator', quantity: 1 }],
    isAlternate: false,
  },
];

// Alternate recipes — correct Builderment game data
const ALTERNATE_RECIPES: Recipe[] = [
  // 1. Copper Wire ALT
  {
    id: 'copper_wire_alt',
    outputId: 'copper_wire',
    outputQuantity: 8,
    building: 'workshop',
    craftTime: 16,
    ingredients: [{ itemId: 'carbon_fiber', quantity: 1 }],
    isAlternate: true,
    alternateName: 'Carbon Fiber Wire',
  },
  // 2. Iron Gear ALT
  {
    id: 'iron_gear_alt',
    outputId: 'iron_gear',
    outputQuantity: 8,
    building: 'workshop',
    craftTime: 16,
    ingredients: [{ itemId: 'steel', quantity: 1 }],
    isAlternate: true,
    alternateName: 'Steel Gear',
  },
  // 3. Electromagnet ALT
  {
    id: 'electromagnet_alt',
    outputId: 'electromagnet',
    outputQuantity: 12,
    building: 'machine_shop',
    craftTime: 16,
    ingredients: [
      { itemId: 'nano_wire', quantity: 1 },
      { itemId: 'steel_rod', quantity: 1 },
    ],
    isAlternate: true,
    alternateName: 'Nano Wire Magnet',
  },
  // 4. Logic Circuit ALT
  {
    id: 'logic_circuit_alt',
    outputId: 'logic_circuit',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 4,
    ingredients: [
      { itemId: 'iron_plating', quantity: 1 },
      { itemId: 'heat_sink', quantity: 1 },
    ],
    isAlternate: true,
    alternateName: 'Plated Circuit',
  },
  // 5. Rotor ALT
  {
    id: 'rotor_alt',
    outputId: 'rotor',
    outputQuantity: 1,
    building: 'machine_shop',
    craftTime: 6,
    ingredients: [
      { itemId: 'copper_ingot', quantity: 18 },
      { itemId: 'iron_plating', quantity: 18 },
    ],
    isAlternate: true,
    alternateName: 'Heavy Rotor',
  },
  // 6. Tungsten Carbide ALT
  {
    id: 'tungsten_carbide_alt',
    outputId: 'tungsten_carbide',
    outputQuantity: 2,
    building: 'forge',
    craftTime: 10,
    ingredients: [
      { itemId: 'tungsten_ingot', quantity: 1 },
      { itemId: 'steel', quantity: 1 },
    ],
    isAlternate: true,
    alternateName: 'Steel Carbide',
  },
  // 7. Steel ALT
  {
    id: 'steel_alt',
    outputId: 'steel',
    outputQuantity: 1,
    building: 'forge',
    craftTime: 8,
    ingredients: [
      { itemId: 'coal', quantity: 4 },
      { itemId: 'iron_ore', quantity: 4 },
    ],
    isAlternate: true,
    alternateName: 'Direct Steel',
  },
  // 8. Concrete ALT
  {
    id: 'concrete_alt',
    outputId: 'concrete',
    outputQuantity: 1,
    building: 'forge',
    craftTime: 8,
    ingredients: [
      { itemId: 'stone', quantity: 20 },
      { itemId: 'wood_frame', quantity: 4 },
    ],
    isAlternate: true,
    alternateName: 'Stone Concrete',
  },
  // 9. Electric Motor ALT
  {
    id: 'electric_motor_alt',
    outputId: 'electric_motor',
    outputQuantity: 1,
    building: 'industrial_factory',
    craftTime: 20,
    ingredients: [
      { itemId: 'electromagnet', quantity: 6 },
      { itemId: 'steel', quantity: 6 },
      { itemId: 'empty_fuel_cell', quantity: 1 },
    ],
    isAlternate: true,
    alternateName: 'Fuel Cell Motor',
  },
  // 10. Industrial Frame ALT
  {
    id: 'industrial_frame_alt',
    outputId: 'industrial_frame',
    outputQuantity: 1,
    building: 'industrial_factory',
    craftTime: 20,
    ingredients: [
      { itemId: 'steel', quantity: 18 },
      { itemId: 'glass', quantity: 10 },
      { itemId: 'carbon_fiber', quantity: 4 },
    ],
    isAlternate: true,
    alternateName: 'Carbon Frame',
  },
  // 11. Turbocharger ALT
  {
    id: 'turbocharger_alt',
    outputId: 'turbocharger',
    outputQuantity: 1,
    building: 'manufacturer',
    craftTime: 15,
    ingredients: [
      { itemId: 'heat_sink', quantity: 4 },
      { itemId: 'computer', quantity: 1 },
      { itemId: 'gyroscope', quantity: 1 },
    ],
    isAlternate: true,
    alternateName: 'Gyro Turbocharger',
  },
  // 12. Super Computer ALT
  {
    id: 'super_computer_alt',
    outputId: 'super_computer',
    outputQuantity: 2,
    building: 'manufacturer',
    craftTime: 30,
    ingredients: [
      { itemId: 'computer', quantity: 2 },
      { itemId: 'silicon', quantity: 40 },
      { itemId: 'gyroscope', quantity: 2 },
      { itemId: 'industrial_frame', quantity: 1 },
    ],
    isAlternate: true,
    alternateName: 'Silicon Super Computer',
  },
];

export const ALL_RECIPES = [...DEFAULT_RECIPES, ...ALTERNATE_RECIPES];

// Get all recipes for a specific item
export function getRecipesForItem(itemId: string): Recipe[] {
  return ALL_RECIPES.filter(r => r.outputId === itemId);
}

// Get the default recipe for an item
export function getDefaultRecipe(itemId: string): Recipe | undefined {
  return DEFAULT_RECIPES.find(r => r.outputId === itemId);
}

// Check if an item has alternate recipes
export function hasAlternateRecipes(itemId: string): boolean {
  return ALTERNATE_RECIPES.some(r => r.outputId === itemId);
}

// Get items that can be produced (have at least one recipe)
export function getProducibleItemIds(): string[] {
  return [...new Set(ALL_RECIPES.map(r => r.outputId))];
}
