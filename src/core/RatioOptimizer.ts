import { ProductionResult } from './ProductionCalculator';
import { isPowerOf2, lcmMultiple, isEffectivelyInteger, gcdMultiple } from './math/gcd';
import { Rational } from './math/rational';
import { BuildingType, EXTRACTOR_RATES } from '../data/buildings';
import { isCleanBeltMultiple } from '../data/belts';

// ============================================================================
// Extractor cost computation
// ============================================================================

export interface ExtractorCost {
  perResource: Map<string, number>; // ceil(resourceRate / ratePerExtractor) per resource
  total: number;                    // sum of all per-resource counts
}

/**
 * Compute the number of extractors needed for a production result at a given scale.
 *
 * @param referenceResult - Production result at rate=1
 * @param scale - The rate/scale to compute for
 * @param extractorLevel - Extractor building level (1-5)
 */
export function computeExtractorCost(
  referenceResult: ProductionResult,
  scale: number,
  extractorLevel: number,
  extractorRates: number[] = EXTRACTOR_RATES
): ExtractorCost {
  const ratePerExtractor = extractorRates[extractorLevel - 1];
  const perResource = new Map<string, number>();
  let total = 0;

  for (const [resourceId, rateRational] of referenceResult.rawResources) {
    const resourceRate = rateRational.toNumber() * scale;
    if (resourceRate <= 0) continue;
    const needed = Math.ceil(resourceRate / ratePerExtractor);
    perResource.set(resourceId, needed);
    total += needed;
  }

  return { perResource, total };
}

// ============================================================================
// Fraction simplicity scoring
// ============================================================================

/**
 * Score how "buildable" a fractional building count is in Builderment.
 * Reflects that binary splitters make halves/quarters easy, thirds doable, etc.
 *
 * @param rational - The building count as a Rational
 * @returns Score from 0.0 (awful) to 1.0 (integer)
 */
export function fractionSimplicityScore(rational: Rational): number {
  const denom = rational.denominator;

  // Exact denominator scores
  const exactScores: Record<number, number> = {
    1: 1.0,   // integer — perfect
    2: 0.95,  // 1:2 split — trivial
    4: 0.90,  // 1:4 split — easy
    8: 0.85,  // 1:8 — two cascaded 1:4 splits
    3: 0.80,  // 1:3 split — doable with splitter
    6: 0.70,  // 1:6 — needs 1:2 + 1:3
    16: 0.80, // power of 2
  };

  if (exactScores[denom] !== undefined) {
    return exactScores[denom];
  }

  // General power-of-2 denominators are good
  if (isPowerOf2(denom)) {
    return Math.max(0.60, 0.90 - Math.log2(denom) * 0.05);
  }

  // Denominators that are multiples of only 2s and 3s are okay
  let temp = denom;
  while (temp % 2 === 0) temp /= 2;
  while (temp % 3 === 0) temp /= 3;
  if (temp === 1) {
    return 0.60; // e.g., 12, 24, etc.
  }

  // Everything else is hard to build
  if (denom <= 10) return 0.40;
  if (denom <= 20) return 0.25;
  return 0.10;
}

/**
 * Compute combined fraction simplicity score across all building counts.
 * Uses weakest-link approach: returns the minimum score.
 *
 * @param rationalCounts - Building counts as Rationals
 * @returns Minimum simplicity score (0.0-1.0), or 1.0 if no buildings
 */
export function computeCombinedFractionScore(
  rationalCounts: Map<BuildingType, Rational>
): number {
  let minScore = 1.0;
  for (const rational of rationalCounts.values()) {
    if (rational.isZero()) continue;
    const score = fractionSimplicityScore(rational);
    if (score < minScore) {
      minScore = score;
    }
  }
  return minScore;
}

// ============================================================================
// Original optimization types and functions
// ============================================================================

export interface OptimizationCandidate {
  scale: number;
  integerCount: number;
  totalBuildings: number;
  integerRatio: number;
  isPowerOf2: boolean;
  score: number;
  buildingCounts: Map<BuildingType, number>;
  // Belt metrics
  cleanBeltRatio: number;       // 0-1, ratio of connections with clean belt multiples
  allBeltsClean: boolean;       // True if ALL connections have clean belt multiples
  // Non-clean belt metrics (need splitters to distribute)
  nonCleanBeltCount: number;    // Number of connections that need fractional belts
  hasNonCleanBelts: boolean;    // True if ANY connection needs splitters
  /** @deprecated Use nonCleanBeltCount instead */
  overfilledBeltCount: number;
  /** @deprecated Use hasNonCleanBelts instead */
  hasOverfilledBelts: boolean;
}

/**
 * Find scale factors that produce integer building counts AND clean belt ratios.
 */
export function findOptimalScales(
  result: ProductionResult,
  maxScale: number = 100,
  beltSpeed: number = 480
): OptimizationCandidate[] {
  const candidates: OptimizationCandidate[] = [];

  // Collect all denominators from building counts
  const denominators: number[] = [];
  for (const count of result.buildingSummary.values()) {
    if (count.denominator > 1) {
      denominators.push(count.denominator);
    }
  }

  // Calculate LCM of all denominators - this gives minimum scale for all integers
  const minIntegerScale = denominators.length > 0 ? lcmMultiple(denominators) : 1;

  // Generate candidate scales
  const scalesToTest = new Set<number>();

  // Always include scale 1
  scalesToTest.add(1);

  // Add LCM-based scales
  if (minIntegerScale <= maxScale) {
    scalesToTest.add(minIntegerScale);
  }

  // Add powers of 2
  for (let i = 0; i <= Math.log2(maxScale); i++) {
    scalesToTest.add(Math.pow(2, i));
  }

  // Add common multipliers
  for (const mult of [2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 30, 32, 48, 60, 64]) {
    if (mult <= maxScale) {
      scalesToTest.add(mult);
    }
  }

  // Add multiples of denominators
  for (const denom of denominators) {
    for (let mult = 1; mult * denom <= maxScale; mult++) {
      scalesToTest.add(mult * denom);
    }
  }

  // Add scales that might give clean belt multiples
  // These are multiples of beltSpeed / throughput for each connection
  const baseThrouhputs = collectThroughputs(result);
  for (const throughput of baseThrouhputs) {
    if (throughput > 0) {
      // Find scales where this throughput becomes a clean belt multiple
      for (let numBelts = 1; numBelts <= 10; numBelts++) {
        const targetThroughput = numBelts * beltSpeed;
        const scale = targetThroughput / throughput;
        if (scale >= 1 && scale <= maxScale && Number.isFinite(scale)) {
          // Round to reasonable precision
          const roundedScale = Math.round(scale * 100) / 100;
          if (roundedScale >= 1 && roundedScale <= maxScale) {
            scalesToTest.add(roundedScale);
          }
        }
      }
    }
  }

  // Evaluate each scale
  for (const scale of scalesToTest) {
    const evaluation = evaluateScale(result, scale, beltSpeed);
    candidates.push(evaluation);
  }

  // Sort by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  // Remove duplicates and limit results
  const seen = new Set<string>();
  const unique: OptimizationCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.scale.toFixed(2)}-${candidate.integerCount}-${candidate.cleanBeltRatio.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  }

  return unique.slice(0, 15);
}

/**
 * Collect all throughputs at scale=1 from the production tree.
 */
function collectThroughputs(result: ProductionResult): number[] {
  const throughputs: number[] = [];

  function processNode(node: typeof result.root) {
    for (const child of node.children) {
      throughputs.push(child.ratePerMinute.toNumber());
      processNode(child);
    }
  }

  processNode(result.root);
  return throughputs;
}

/**
 * Compute rational building counts for a given scale.
 * Uses exact Rational arithmetic to preserve fraction information.
 */
export function computeRationalBuildingCounts(
  result: ProductionResult,
  scale: number
): Map<BuildingType, Rational> {
  const scaleRational = Rational.fromNumber(scale);
  const rationalCounts = new Map<BuildingType, Rational>();
  for (const [buildingType, count] of result.buildingSummary) {
    rationalCounts.set(buildingType, count.multiply(scaleRational));
  }
  return rationalCounts;
}

/**
 * Evaluate a specific scale factor.
 */
export function evaluateScale(
  result: ProductionResult,
  scale: number,
  beltSpeed: number
): OptimizationCandidate {
  const buildingCounts = new Map<BuildingType, number>();
  let integerCount = 0;
  let totalBuildings = 0;

  for (const [buildingType, count] of result.buildingSummary) {
    const scaledCount = count.scale(scale).toNumber();
    buildingCounts.set(buildingType, scaledCount);
    totalBuildings++;

    if (isEffectivelyInteger(scaledCount)) {
      integerCount++;
    }
  }

  const integerRatio = totalBuildings > 0 ? integerCount / totalBuildings : 1;
  const power2 = isPowerOf2(scale);

  // Calculate belt metrics
  const { cleanBeltRatio, allBeltsClean } = calculateBeltMetrics(result, scale, beltSpeed);
  const { nonCleanBeltCount, hasNonCleanBelts } = calculateNonCleanBeltMetrics(result, scale, beltSpeed);

  // SCORING FORMULA - prioritize integer buildings!
  //
  // - Base: integer ratio (0-1) * 100 (PRIMARY GOAL)
  // - Bonus: +50 if ALL buildings are integers (big bonus for all-integer!)
  // - Penalty: -20 per non-clean belt (need splitters, but not a major issue)
  // - Nice-to-have: cleanBeltRatio * 20 (clean belts are nice but not essential)
  // - Bonus: +10 if all belts are clean
  // - Bonus: +5 if power of 2
  // - Penalty: -0.05 * scale (prefer smaller scales)
  let score = integerRatio * 100;
  if (integerCount === totalBuildings) {
    score += 50;  // Big bonus for all-integer configurations
  }
  score -= nonCleanBeltCount * 20;     // Non-clean belts need splitters (minor penalty)
  score += cleanBeltRatio * 20;        // Clean belts are nice-to-have
  if (allBeltsClean) {
    score += 10;
  }
  if (power2) {
    score += 5;
  }
  score -= scale * 0.05;

  return {
    scale,
    integerCount,
    totalBuildings,
    integerRatio,
    isPowerOf2: power2,
    score,
    buildingCounts,
    cleanBeltRatio,
    allBeltsClean,
    nonCleanBeltCount,
    hasNonCleanBelts,
    // Deprecated aliases for backward compatibility
    overfilledBeltCount: nonCleanBeltCount,
    hasOverfilledBelts: hasNonCleanBelts,
  };
}

/**
 * Calculate belt metrics for a scaled production.
 */
function calculateBeltMetrics(
  result: ProductionResult,
  scale: number,
  beltSpeed: number
): { cleanBeltRatio: number; allBeltsClean: boolean } {
  let cleanCount = 0;
  let totalCount = 0;

  function processNode(node: typeof result.root) {
    for (const child of node.children) {
      const throughput = child.ratePerMinute.toNumber() * scale;
      if (isCleanBeltMultiple(throughput, beltSpeed)) {
        cleanCount++;
      }
      totalCount++;
      processNode(child);
    }
  }

  processNode(result.root);

  return {
    cleanBeltRatio: totalCount > 0 ? cleanCount / totalCount : 1,
    allBeltsClean: cleanCount === totalCount,
  };
}

/**
 * Calculate non-clean belt metrics for a scaled production.
 * Non-clean belts are connections where throughput doesn't evenly divide
 * by belt speed, meaning you need splitters to distribute items.
 */
function calculateNonCleanBeltMetrics(
  result: ProductionResult,
  scale: number,
  beltSpeed: number
): { nonCleanBeltCount: number; hasNonCleanBelts: boolean } {
  let nonCleanCount = 0;

  function processNode(node: typeof result.root) {
    for (const child of node.children) {
      const throughput = child.ratePerMinute.toNumber() * scale;
      if (!isCleanBeltMultiple(throughput, beltSpeed)) {
        nonCleanCount++;
      }
      processNode(child);
    }
  }

  processNode(result.root);

  return {
    nonCleanBeltCount: nonCleanCount,
    hasNonCleanBelts: nonCleanCount > 0,
  };
}

/**
 * Find the minimum scale where all building counts are integers.
 */
export function findMinIntegerScale(result: ProductionResult): number {
  const denominators: number[] = [];
  for (const count of result.buildingSummary.values()) {
    if (count.denominator > 1) {
      denominators.push(count.denominator);
    }
  }
  return denominators.length > 0 ? lcmMultiple(denominators) : 1;
}

/**
 * Check if current production has all integer building counts.
 */
export function hasAllIntegerCounts(result: ProductionResult): boolean {
  for (const count of result.buildingSummary.values()) {
    if (!count.isInteger()) {
      return false;
    }
  }
  return true;
}

/**
 * Get a human-readable description of a scale candidate.
 */
export function describeCandidate(candidate: OptimizationCandidate): string {
  const parts: string[] = [];
  parts.push(`${candidate.integerCount}/${candidate.totalBuildings} integer`);
  if (candidate.allBeltsClean) {
    parts.push('clean belts');
  }
  if (candidate.isPowerOf2) {
    parts.push('power-of-2');
  }
  return parts.join(', ');
}

/**
 * Find the best scale factor where ALL buildings are integers.
 * This is used for auto-integer mode to find the optimal all-integer configuration.
 *
 * Preference order:
 * 1. Clean belts (no splitters needed)
 * 2. Lowest scale (simplest configuration)
 * 3. Higher clean belt ratio (tie-breaker)
 */
export function findBestAllIntegerScale(
  result: ProductionResult,
  maxScale: number = 100,
  beltSpeed: number = 480
): OptimizationCandidate | null {
  const candidates = findOptimalScales(result, maxScale, beltSpeed);

  // Filter to only all-integer candidates
  const allIntegerCandidates = candidates.filter(
    (c) => c.integerCount === c.totalBuildings
  );

  if (allIntegerCandidates.length === 0) {
    return null;
  }

  // Sort by preference:
  // 1. All clean belts first (no splitters needed)
  // 2. Then by lowest scale
  // 3. Then by highest clean belt ratio
  allIntegerCandidates.sort((a, b) => {
    // Prefer all clean belts
    if (a.hasNonCleanBelts !== b.hasNonCleanBelts) {
      return a.hasNonCleanBelts ? 1 : -1;
    }
    // Prefer lower scale (simpler)
    if (a.scale !== b.scale) {
      return a.scale - b.scale;
    }
    // Prefer higher clean belt ratio
    return b.cleanBeltRatio - a.cleanBeltRatio;
  });

  return allIntegerCandidates[0];
}

/**
 * Find the true minimum all-integer rate without any maxScale limit.
 * This computes the LCM of all denominators to find the exact minimum
 * rate where ALL building counts become integers.
 *
 * Returns null if the minimum integer scale is impractically large (> 10000).
 */
export function findMinimumAllIntegerRate(
  result: ProductionResult,
  beltSpeed: number = 480
): OptimizationCandidate | null {
  const minIntegerScale = findMinIntegerScale(result);

  // Sanity check - don't return impractically large values
  if (minIntegerScale > 10000) {
    return null;
  }

  return evaluateScale(result, minIntegerScale, beltSpeed);
}

/**
 * Represents a multiplier option for all-integer rates with GCD analysis.
 */
export interface IntegerMultiplier {
  multiplier: number;       // 1x, 2x, 4x, etc.
  rate: number;             // The actual rate (baseRate * multiplier)
  buildingCounts: number[]; // Building counts at this multiplier
  gcd: number;              // GCD of all building counts
  splitWays: number;        // Number of ways this can be evenly split (= gcd)
  candidate: OptimizationCandidate;  // Full evaluation at this scale
}

/**
 * Get all-integer multipliers with GCD analysis for belt splitting.
 *
 * For users wanting to split production across multiple belt lines,
 * this shows which multipliers allow even splitting.
 *
 * @param result - Production result at rate=1
 * @param baseRate - The minimum all-integer rate
 * @param maxMultiplier - Maximum multiplier to consider (default 10)
 * @param beltSpeed - Belt speed for evaluation
 */
export function getIntegerMultipliers(
  result: ProductionResult,
  baseRate: number,
  maxMultiplier: number = 10,
  beltSpeed: number = 480
): IntegerMultiplier[] {
  const multipliers: IntegerMultiplier[] = [];

  // Common useful multipliers
  const multipliersToCheck = [1, 2, 3, 4, 5, 6, 8, 10];

  for (const mult of multipliersToCheck) {
    if (mult > maxMultiplier) continue;

    const rate = baseRate * mult;
    const candidate = evaluateScale(result, rate, beltSpeed);

    // Get building counts as integers
    const buildingCounts: number[] = [];
    for (const count of candidate.buildingCounts.values()) {
      const rounded = Math.round(count);
      if (rounded > 0) {
        buildingCounts.push(rounded);
      }
    }

    // Calculate GCD of all building counts
    const gcd = buildingCounts.length > 0 ? gcdMultiple(buildingCounts) : 1;

    multipliers.push({
      multiplier: mult,
      rate,
      buildingCounts,
      gcd,
      splitWays: gcd,
      candidate,
    });
  }

  return multipliers;
}

// ============================================================================
// Practical Optimum — extractor-aware rate recommendations
// ============================================================================

export interface PracticalOptimum {
  rate: number;
  extractorCost: ExtractorCost;
  fractionScore: number;             // 0-1, weakest-link fraction simplicity
  candidate: OptimizationCandidate;
  allInteger: boolean;
  buildingCounts: Map<BuildingType, number>;
  rationalBuildingCounts: Map<BuildingType, Rational>;
  doublings: PracticalOptimum[];     // x2, x4, x8 ... that maintain quality
}

export interface BestPracticalRates {
  bestSimple: PracticalOptimum | null;
  bestAllInteger: PracticalOptimum | null;
}

/**
 * Describe the fraction quality for display (e.g. "all halves", "has thirds").
 */
export function describeFractionQuality(rationalCounts: Map<BuildingType, Rational>): string {
  let maxDenom = 1;
  for (const r of rationalCounts.values()) {
    if (r.isZero()) continue;
    if (r.denominator > maxDenom) maxDenom = r.denominator;
  }
  if (maxDenom === 1) return 'all integer';
  if (maxDenom === 2) return 'halves';
  if (maxDenom === 3) return 'thirds';
  if (maxDenom === 4) return 'quarters';
  if (isPowerOf2(maxDenom)) return `1/${maxDenom} splits`;
  return `1/${maxDenom} fractions`;
}

/**
 * Find the two best practical rates for a production configuration:
 * 1. bestSimple — fewest extractors among rates with good fraction simplicity (>= 0.80)
 * 2. bestAllInteger — lowest rate where every building count is a whole number
 *
 * @param referenceResult - Production result at rate=1
 * @param extractorLevel - Extractor building level (1-5)
 * @param beltSpeed - Belt speed for evaluation
 */
export function findBestPracticalRates(
  referenceResult: ProductionResult,
  extractorLevel: number,
  beltSpeed: number,
  extractorRates: number[] = EXTRACTOR_RATES
): BestPracticalRates {
  const minIntegerScale = findMinIntegerScale(referenceResult);

  // --- Generate candidate scales ---
  const scalesToTest = new Set<number>();

  // Integers 1..200
  for (let i = 1; i <= 200; i++) {
    scalesToTest.add(i);
  }

  // Fractions: n/2, n/3, n/4 for n=1..200
  for (const denom of [2, 3, 4]) {
    for (let num = 1; num <= 200; num++) {
      scalesToTest.add(num / denom);
    }
  }

  // Denominators from building counts (e.g. n/6, n/8...)
  const buildingDenoms = new Set<number>();
  for (const count of referenceResult.buildingSummary.values()) {
    if (count.denominator > 1) {
      buildingDenoms.add(count.denominator);
    }
  }
  for (const denom of buildingDenoms) {
    if (denom > 1000) continue; // skip huge denoms from Rational precision artifacts
    for (let num = 1; num / denom <= 200; num++) {
      scalesToTest.add(num / denom);
    }
  }

  // LCM and its divisors
  if (minIntegerScale <= 10000) {
    scalesToTest.add(minIntegerScale);
    for (let d = 1; d * d <= minIntegerScale; d++) {
      if (minIntegerScale % d === 0) {
        scalesToTest.add(d);
        scalesToTest.add(minIntegerScale / d);
      }
    }
    // Small multiples of LCM
    for (let m = 2; m * minIntegerScale <= 10000; m++) {
      scalesToTest.add(m * minIntegerScale);
    }
  }

  // Powers of 2
  for (let i = 0; i <= 13; i++) {
    scalesToTest.add(Math.pow(2, i));
  }

  // Belt-aligned scales
  const throughputs = collectThroughputs(referenceResult);
  for (const throughput of throughputs) {
    if (throughput > 0) {
      for (let numBelts = 1; numBelts <= 10; numBelts++) {
        const targetThroughput = numBelts * beltSpeed;
        const scale = targetThroughput / throughput;
        if (scale >= 0.5 && scale <= 10000 && Number.isFinite(scale)) {
          const rounded = Math.round(scale * 100) / 100;
          if (rounded >= 0.5) scalesToTest.add(rounded);
        }
      }
    }
  }

  // --- Evaluate all candidates ---
  interface EvaluatedCandidate {
    scale: number;
    candidate: OptimizationCandidate;
    extractorCost: ExtractorCost;
    fractionScore: number;
    rationalCounts: Map<BuildingType, Rational>;
    allInteger: boolean;
  }

  const evaluated: EvaluatedCandidate[] = [];

  for (const scale of scalesToTest) {
    if (scale <= 0) continue;

    const candidate = evaluateScale(referenceResult, scale, beltSpeed);
    const extractorCost = computeExtractorCost(referenceResult, scale, extractorLevel, extractorRates);
    const rationalCounts = computeRationalBuildingCounts(referenceResult, scale);
    const fractionScore = computeCombinedFractionScore(rationalCounts);
    const allInteger = candidate.integerCount === candidate.totalBuildings;

    evaluated.push({
      scale,
      candidate,
      extractorCost,
      fractionScore,
      rationalCounts,
      allInteger,
    });
  }

  // --- Find bestSimple: highest fraction score (>= 0.80), then fewest extractors ---
  const SIMPLE_THRESHOLD = 0.80;
  const simpleCandidates = evaluated
    .filter((e) => e.fractionScore >= SIMPLE_THRESHOLD && e.extractorCost.total > 0)
    .sort((a, b) => {
      // Primary: fewest extractors
      if (a.extractorCost.total !== b.extractorCost.total) {
        return a.extractorCost.total - b.extractorCost.total;
      }
      // Tie-break: higher fraction score
      if (a.fractionScore !== b.fractionScore) {
        return b.fractionScore - a.fractionScore;
      }
      // Tie-break: prefer all-integer
      if (a.allInteger !== b.allInteger) {
        return a.allInteger ? -1 : 1;
      }
      // Tie-break: lower scale
      return a.scale - b.scale;
    });

  const bestSimpleEval = simpleCandidates.length > 0 ? simpleCandidates[0] : null;

  // --- Find bestAllInteger: lowest scale where all building counts are integers ---
  const allIntegerCandidates = evaluated
    .filter((e) => e.allInteger)
    .sort((a, b) => a.scale - b.scale);

  const bestAllIntegerEval = allIntegerCandidates.length > 0 ? allIntegerCandidates[0] : null;

  // --- Build PracticalOptimum objects with doublings ---
  function buildOptimum(eval_: EvaluatedCandidate): PracticalOptimum {
    const doublings: PracticalOptimum[] = [];
    for (const mult of [2, 4, 8]) {
      const doubledScale = eval_.scale * mult;
      const dCandidate = evaluateScale(referenceResult, doubledScale, beltSpeed);
      const dExtractorCost = computeExtractorCost(referenceResult, doubledScale, extractorLevel, extractorRates);
      const dRationalCounts = computeRationalBuildingCounts(referenceResult, doubledScale);
      const dFractionScore = computeCombinedFractionScore(dRationalCounts);
      // Only include doublings that maintain fraction quality
      if (dFractionScore >= eval_.fractionScore - 0.05) {
        doublings.push({
          rate: doubledScale,
          extractorCost: dExtractorCost,
          fractionScore: dFractionScore,
          candidate: dCandidate,
          allInteger: dCandidate.integerCount === dCandidate.totalBuildings,
          buildingCounts: dCandidate.buildingCounts,
          rationalBuildingCounts: dRationalCounts,
          doublings: [], // Don't recurse
        });
      }
    }

    return {
      rate: eval_.scale,
      extractorCost: eval_.extractorCost,
      fractionScore: eval_.fractionScore,
      candidate: eval_.candidate,
      allInteger: eval_.allInteger,
      buildingCounts: eval_.candidate.buildingCounts,
      rationalBuildingCounts: eval_.rationalCounts,
      doublings,
    };
  }

  return {
    bestSimple: bestSimpleEval ? buildOptimum(bestSimpleEval) : null,
    bestAllInteger: bestAllIntegerEval ? buildOptimum(bestAllIntegerEval) : null,
  };
}
