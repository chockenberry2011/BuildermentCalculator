export type ItemCategory = 'raw' | 'intermediate' | 'component' | 'advanced' | 'end_product';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
}

export const ITEMS: Record<string, Item> = {
  // Raw Resources
  wood_log: { id: 'wood_log', name: 'Wood Log', category: 'raw' },
  stone: { id: 'stone', name: 'Stone', category: 'raw' },
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', category: 'raw' },
  copper_ore: { id: 'copper_ore', name: 'Copper Ore', category: 'raw' },
  coal: { id: 'coal', name: 'Coal', category: 'raw' },
  wolframite: { id: 'wolframite', name: 'Wolframite', category: 'raw' },
  gold_ore: { id: 'gold_ore', name: 'Gold Ore', category: 'raw' },

  // Basic Intermediates
  wood_plank: { id: 'wood_plank', name: 'Wood Plank', category: 'intermediate' },
  sand: { id: 'sand', name: 'Sand', category: 'intermediate' },
  iron_ingot: { id: 'iron_ingot', name: 'Iron Ingot', category: 'intermediate' },
  copper_ingot: { id: 'copper_ingot', name: 'Copper Ingot', category: 'intermediate' },
  glass: { id: 'glass', name: 'Glass', category: 'intermediate' },
  graphite: { id: 'graphite', name: 'Graphite', category: 'intermediate' },
  steel: { id: 'steel', name: 'Steel', category: 'intermediate' },
  tungsten_ore: { id: 'tungsten_ore', name: 'Tungsten Ore', category: 'intermediate' },
  gold_ingot: { id: 'gold_ingot', name: 'Gold Ingot', category: 'intermediate' },
  tungsten_ingot: { id: 'tungsten_ingot', name: 'Tungsten Ingot', category: 'intermediate' },
  silicon: { id: 'silicon', name: 'Silicon', category: 'intermediate' },
  carbon_fiber: { id: 'carbon_fiber', name: 'Carbon Fiber', category: 'intermediate' },
  concrete: { id: 'concrete', name: 'Concrete', category: 'intermediate' },
  steel_rod: { id: 'steel_rod', name: 'Steel Rod', category: 'intermediate' },
  tungsten_carbide: { id: 'tungsten_carbide', name: 'Tungsten Carbide', category: 'intermediate' },
  alumina: { id: 'alumina', name: 'Alumina', category: 'intermediate' },
  aluminum_ingot: { id: 'aluminum_ingot', name: 'Aluminum Ingot', category: 'intermediate' },
  aluminum_rod: { id: 'aluminum_rod', name: 'Aluminum Rod', category: 'intermediate' },
  aluminum_sheet: { id: 'aluminum_sheet', name: 'Aluminum Sheet', category: 'intermediate' },

  // Components
  wood_frame: { id: 'wood_frame', name: 'Wood Frame', category: 'component' },
  copper_wire: { id: 'copper_wire', name: 'Copper Wire', category: 'component' },
  iron_gear: { id: 'iron_gear', name: 'Iron Gear', category: 'component' },
  heat_sink: { id: 'heat_sink', name: 'Heat Sink', category: 'component' },
  iron_plating: { id: 'iron_plating', name: 'Iron Plating', category: 'component' },
  electromagnet: { id: 'electromagnet', name: 'Electromagnet', category: 'component' },
  battery: { id: 'battery', name: 'Battery', category: 'component' },
  steel_plating: { id: 'steel_plating', name: 'Steel Plating', category: 'component' },
  coupler: { id: 'coupler', name: 'Coupler', category: 'component' },
  condenser_lens: { id: 'condenser_lens', name: 'Condenser Lens', category: 'component' },
  condenser: { id: 'condenser', name: 'Condenser', category: 'component' },
  coil: { id: 'coil', name: 'Coil', category: 'component' },
  rotor: { id: 'rotor', name: 'Rotor', category: 'component' },
  metal_frame: { id: 'metal_frame', name: 'Metal Frame', category: 'component' },
  tank: { id: 'tank', name: 'Tank', category: 'component' },
  gyroscope: { id: 'gyroscope', name: 'Gyroscope', category: 'component' },
  pump: { id: 'pump', name: 'Pump', category: 'component' },
  nano_wire: { id: 'nano_wire', name: 'Nano Wire', category: 'component' },
  empty_fuel_cell: { id: 'empty_fuel_cell', name: 'Empty Fuel Cell', category: 'component' },

  // Advanced Components
  energy_cube: { id: 'energy_cube', name: 'Energy Cube', category: 'advanced' },
  logic_circuit: { id: 'logic_circuit', name: 'Logic Circuit', category: 'advanced' },
  electric_motor: { id: 'electric_motor', name: 'Electric Motor', category: 'advanced' },
  industrial_frame: { id: 'industrial_frame', name: 'Industrial Frame', category: 'advanced' },
  computer: { id: 'computer', name: 'Computer', category: 'advanced' },
  stabilizer: { id: 'stabilizer', name: 'Stabilizer', category: 'advanced' },
  matter_compressor: { id: 'matter_compressor', name: 'Matter Compressor', category: 'advanced' },
  electron_microscope: { id: 'electron_microscope', name: 'Electron Microscope', category: 'advanced' },
  magnetic_field_generator: { id: 'magnetic_field_generator', name: 'Magnetic Field Generator', category: 'advanced' },
  particle_glue: { id: 'particle_glue', name: 'Particle Glue', category: 'advanced' },
  super_computer: { id: 'super_computer', name: 'Super Computer', category: 'advanced' },

  // End Products
  turbocharger: { id: 'turbocharger', name: 'Turbocharger', category: 'end_product' },
  earth_token: { id: 'earth_token', name: 'Earth Token', category: 'end_product' },
  empty_earth_token: { id: 'empty_earth_token', name: 'Empty Earth Token', category: 'end_product' },
  motor_unit: { id: 'motor_unit', name: 'Motor Unit', category: 'end_product' },
  matter_duplicator: { id: 'matter_duplicator', name: 'Matter Duplicator', category: 'end_product' },
  quantum_entangler: { id: 'quantum_entangler', name: 'Quantum Entangler', category: 'end_product' },
  atomic_locator: { id: 'atomic_locator', name: 'Atomic Locator', category: 'end_product' },
};

export const ITEM_LIST = Object.values(ITEMS);

export function getItem(id: string): Item | undefined {
  return ITEMS[id];
}

// Items that can be selected as production targets (non-raw)
export const PRODUCIBLE_ITEMS = ITEM_LIST.filter(item => item.category !== 'raw');
