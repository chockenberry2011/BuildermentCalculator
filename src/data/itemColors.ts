/**
 * Unique per-item color map — single source of truth for coloring nodes,
 * edges, handles, minimap dots, and resource icons by item identity.
 *
 * Every item gets its own visually distinct color. Related items share a
 * hue family but differ in saturation/lightness so you can tell them apart
 * at a glance.
 */

const ITEM_COLORS: Record<string, string> = {
  // ── Copper family (warm amber/orange) ──────────────────────────
  copper_ore:    '#D97706', // amber-600
  copper_ingot:  '#B45309', // amber-700
  copper_wire:   '#F59E0B', // amber-500
  heat_sink:     '#D2691E', // chocolate
  coil:          '#E8852E', // warm orange
  gyroscope:     '#C77D34', // sandy brown

  // ── Iron family (slate/steel blues) ────────────────────────────
  iron_ore:      '#64748B', // slate-500
  iron_ingot:    '#8294AA', // lighter slate
  iron_gear:     '#4B6078', // dark slate
  iron_plating:  '#7B8FA3', // cool gray-blue
  rotor:         '#5B7A95', // steel blue
  metal_frame:   '#3E5C76', // deep steel
  pump:          '#6D8BA6', // muted blue

  // ── Steel family (dark blue-gray) ──────────────────────────────
  steel:         '#475569', // slate-600
  steel_rod:     '#5A6B80', // mid steel
  steel_plating: '#334155', // slate-700

  // ── Gold family (warm yellows) ─────────────────────────────────
  gold_ore:          '#EAB308', // yellow-500
  gold_ingot:        '#CA8A04', // yellow-600
  earth_token:       '#A16207', // amber-700
  empty_earth_token: '#D4A017', // golden rod

  // ── Tungsten family (violets/purples) ──────────────────────────
  wolframite:        '#7C3AED', // violet-600
  tungsten_ore:      '#6D28D9', // violet-700
  tungsten_ingot:    '#8B5CF6', // violet-500
  tungsten_carbide:  '#5B21B6', // violet-800
  coupler:           '#A78BFA', // violet-400

  // ── Wood family (earthy browns) ────────────────────────────────
  wood_log:    '#92400E', // amber-800
  wood_plank:  '#A8601C', // warm brown
  wood_frame:  '#7C5730', // medium brown

  // ── Stone & Sand (warm grays/tans) ─────────────────────────────
  stone: '#78716C', // stone-500
  sand:  '#B8A590', // warm tan

  // ── Coal / Carbon family (charcoals) ───────────────────────────
  coal:         '#57534E', // stone-600
  graphite:     '#44403C', // stone-700
  carbon_fiber: '#737373', // neutral-500

  // ── Glass / Silicon family (teal/cyan spectrum) ────────────────
  glass:               '#0D9488', // teal-600
  silicon:             '#2DD4BF', // teal-400
  condenser_lens:      '#06B6D4', // cyan-500
  condenser:           '#0891B2', // cyan-600
  nano_wire:           '#14B8A6', // teal-500
  electron_microscope: '#0E7490', // cyan-700

  // ── Aluminum family (sky/light blues) ──────────────────────────
  alumina:         '#0284C7', // sky-600
  aluminum_ingot:  '#0EA5E9', // sky-500
  aluminum_rod:    '#38BDF8', // sky-400
  aluminum_sheet:  '#0369A1', // sky-700

  // ── Electronics family (greens) ────────────────────────────────
  electromagnet:             '#059669', // emerald-600
  logic_circuit:             '#10B981', // emerald-500
  electric_motor:            '#047857', // emerald-700
  computer:                  '#34D399', // emerald-400
  stabilizer:                '#16A34A', // green-600
  super_computer:            '#22C55E', // green-500
  magnetic_field_generator:  '#15803D', // green-700
  turbocharger:              '#4ADE80', // green-400
  motor_unit:                '#2E8B57', // sea green

  // ── Energy family (reds/pinks) ─────────────────────────────────
  battery:            '#DC2626', // red-600
  energy_cube:        '#EF4444', // red-500
  matter_compressor:  '#B91C1C', // red-700
  particle_glue:      '#F87171', // red-400
  matter_duplicator:  '#E11D48', // rose-600

  // ── Concrete / Industrial (neutral grays) ──────────────────────
  concrete:         '#6B7280', // gray-500
  industrial_frame: '#4B5563', // gray-600
  tank:             '#9CA3AF', // gray-400

  // ── End products (vivid highlights) ────────────────────────────
  quantum_entangler: '#D946EF', // fuchsia-500
  atomic_locator:    '#C026D3', // fuchsia-600
};

/** Look up the unique color for any item. Falls back to neutral gray. */
export function getItemColor(itemId: string): string {
  return ITEM_COLORS[itemId] ?? '#6B7280';
}
