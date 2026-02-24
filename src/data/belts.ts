export type BeltStatus = 'multi-belt' | 'near-capacity' | 'ok';

const NEAR_CAPACITY_THRESHOLD = 0.8; // >80% of a single belt

/**
 * Classify a connection's belt status:
 * - multi-belt: needs 2+ belts (throughput exceeds belt speed)
 * - near-capacity: single belt but >80% full
 * - ok: everything else
 */
export function classifyBeltStatus(throughput: number, beltSpeed: number): BeltStatus {
  if (throughput <= 0) return 'ok';
  if (throughput > beltSpeed) return 'multi-belt';
  if (throughput / beltSpeed > NEAR_CAPACITY_THRESHOLD) return 'near-capacity';
  return 'ok';
}

// Known belt speed upgrade values from the game
// Users can also enter custom values
export const BELT_SPEED_PRESETS: { name: string; itemsPerMinute: number }[] = [
  { name: 'Belt Speed I', itemsPerMinute: 165 },
  { name: 'Belt Speed II', itemsPerMinute: 180 },
  { name: 'Belt Speed III', itemsPerMinute: 195 },
  { name: 'Belt Speed IV', itemsPerMinute: 210 },
  { name: 'Belt Speed V', itemsPerMinute: 240 },
  { name: 'Belt Speed VI', itemsPerMinute: 270 },
  { name: 'Belt Speed VII', itemsPerMinute: 300 },
  { name: 'Belt Speed VIII', itemsPerMinute: 330 },
  { name: 'Belt Speed IX', itemsPerMinute: 375 },
  { name: 'Belt Speed X', itemsPerMinute: 420 },
  { name: 'Belt Speed XI', itemsPerMinute: 450 },
  { name: 'Belt Speed XII', itemsPerMinute: 480 },
];

export const DEFAULT_BELT_SPEED = 480; // Max upgrade

/**
 * Check if a throughput is a clean multiple of belt capacity.
 * Returns true if throughput can be handled by whole number of belts.
 */
export function isCleanBeltMultiple(throughput: number, beltSpeed: number): boolean {
  if (throughput <= 0) return true;
  // Check if throughput / beltSpeed is effectively an integer
  const beltsNeeded = throughput / beltSpeed;
  return Math.abs(beltsNeeded - Math.round(beltsNeeded)) < 0.001;
}

/**
 * Calculate how many belts are needed for a throughput.
 */
export function getBeltsNeeded(throughput: number, beltSpeed: number): number {
  if (throughput <= 0) return 0;
  return Math.ceil(throughput / beltSpeed);
}

/**
 * Calculate belt utilization (0-1) for a connection.
 * 1.0 = perfect utilization, lower = wasted capacity
 */
export function getBeltUtilization(throughput: number, beltSpeed: number): number {
  if (throughput <= 0) return 1;
  const beltsNeeded = getBeltsNeeded(throughput, beltSpeed);
  return throughput / (beltsNeeded * beltSpeed);
}

/**
 * Find the exact throughput that would perfectly fill N belts.
 */
export function getPerfectBeltThroughput(numBelts: number, beltSpeed: number): number {
  return numBelts * beltSpeed;
}

/**
 * Check if a throughput requires fractional belt usage.
 * Returns true if the throughput doesn't evenly divide by belt speed,
 * meaning you need splitters/mergers to distribute items across belts.
 *
 * This is NOT the same as "overfilled" - with ceiling math we always
 * allocate enough belt capacity. This just means the belts won't be
 * perfectly utilized.
 */
export function requiresFractionalBelts(throughput: number, beltSpeed: number): boolean {
  if (throughput <= 0) return false;
  return !isCleanBeltMultiple(throughput, beltSpeed);
}

/**
 * @deprecated Use requiresFractionalBelts instead. This name was misleading.
 * "Overfilled" implied exceeding capacity, but this actually checks for
 * fractional belt usage (not a clean multiple).
 */
export function isBeltOverfilled(throughput: number, beltSpeed: number): boolean {
  return requiresFractionalBelts(throughput, beltSpeed);
}
