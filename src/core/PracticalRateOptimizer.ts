import { ProductionResult } from './ProductionCalculator';
import { BuildingType, EXTRACTOR_RATES } from '../data/buildings';
import { evaluateScale, findMinIntegerScale } from './RatioOptimizer';
import { isPowerOf2 } from './math/gcd';

export interface PracticalCandidate {
  rate: number;
  extractorsPerResource: Map<string, number>;
  totalExtractors: number;
  utilization: number; // 0-1, budget utilization
  integerRatio: number;
  allInteger: boolean;
  cleanBeltRatio: number;
  allBeltsClean: boolean;
  nonCleanBeltCount: number;
  buildingCounts: Map<BuildingType, number>;
  score: number;
}

export interface PracticalRateResult {
  candidates: PracticalCandidate[];
  maxAchievableRate: number;
  totalExtractorsAtRate1: number;
}

/**
 * Find practical production rates that fit within an extractor budget.
 *
 * @param referenceResult - Production result calculated at rate=1
 * @param budget - Total extractor budget
 * @param extractorLevel - Current extractor level (1-5)
 * @param beltSpeed - Belt speed for evaluation
 */
export function findPracticalRates(
  referenceResult: ProductionResult,
  budget: number,
  extractorLevel: number,
  beltSpeed: number
): PracticalRateResult {
  const ratePerExtractor = EXTRACTOR_RATES[extractorLevel - 1];

  // Compute extractors needed per resource at rate=1
  const extractorsAtRate1 = new Map<string, number>();
  let totalExtractorsAtRate1 = 0;

  for (const [resourceId, rateRational] of referenceResult.rawResources) {
    const resourceRate = rateRational.toNumber();
    if (resourceRate <= 0) continue;
    const extractorsNeeded = resourceRate / ratePerExtractor;
    extractorsAtRate1.set(resourceId, extractorsNeeded);
    totalExtractorsAtRate1 += extractorsNeeded;
  }

  if (totalExtractorsAtRate1 <= 0) {
    return { candidates: [], maxAchievableRate: 0, totalExtractorsAtRate1: 0 };
  }

  // Max rate = budget / extractors-per-unit-rate
  const maxAchievableRate = budget / totalExtractorsAtRate1;

  if (maxAchievableRate <= 0) {
    return { candidates: [], maxAchievableRate: 0, totalExtractorsAtRate1 };
  }

  // Generate candidate rates
  const ratesToTest = new Set<number>();

  // Integers up to floor(maxRate)
  const maxInt = Math.floor(maxAchievableRate);
  for (let i = 1; i <= Math.min(maxInt, 200); i++) {
    ratesToTest.add(i);
  }
  // For large maxInt, sample evenly
  if (maxInt > 200) {
    for (let i = 200; i <= maxInt; i += Math.max(1, Math.floor(maxInt / 100))) {
      ratesToTest.add(i);
    }
    ratesToTest.add(maxInt);
  }

  // Denominator fractions from building counts
  const denominators = new Set<number>();
  for (const count of referenceResult.buildingSummary.values()) {
    if (count.denominator > 1) {
      denominators.add(count.denominator);
    }
  }
  for (const denom of denominators) {
    for (let num = 1; num / denom <= maxAchievableRate; num++) {
      ratesToTest.add(num / denom);
    }
  }

  // Powers of 2
  for (let i = 0; Math.pow(2, i) <= maxAchievableRate; i++) {
    ratesToTest.add(Math.pow(2, i));
  }

  // Common multipliers
  for (const mult of [2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 30, 32, 48, 60, 64]) {
    if (mult <= maxAchievableRate) {
      ratesToTest.add(mult);
    }
  }

  // Divisors of the all-integer scale (LCM of denominators)
  const minIntegerScale = findMinIntegerScale(referenceResult);
  if (minIntegerScale <= maxAchievableRate) {
    ratesToTest.add(minIntegerScale);
    // Add divisors of minIntegerScale
    for (let d = 1; d * d <= minIntegerScale; d++) {
      if (minIntegerScale % d === 0) {
        if (d <= maxAchievableRate) ratesToTest.add(d);
        const other = minIntegerScale / d;
        if (other <= maxAchievableRate) ratesToTest.add(other);
      }
    }
    // Add multiples of minIntegerScale
    for (let m = 2; m * minIntegerScale <= maxAchievableRate; m++) {
      ratesToTest.add(m * minIntegerScale);
    }
  }

  // Belt-aligned rates from throughputs
  const throughputs = collectThroughputs(referenceResult);
  for (const throughput of throughputs) {
    if (throughput > 0) {
      for (let numBelts = 1; numBelts <= 10; numBelts++) {
        const targetThroughput = numBelts * beltSpeed;
        const rate = targetThroughput / throughput;
        if (rate >= 1 && rate <= maxAchievableRate && Number.isFinite(rate)) {
          const rounded = Math.round(rate * 100) / 100;
          if (rounded >= 1 && rounded <= maxAchievableRate) {
            ratesToTest.add(rounded);
          }
        }
      }
    }
  }

  // Percentages of maxRate (for good budget utilization)
  for (const pct of [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.98, 1.0]) {
    const rate = Math.floor(maxAchievableRate * pct * 100) / 100;
    if (rate >= 1) {
      ratesToTest.add(rate);
    }
  }

  // Evaluate candidates
  const candidates: PracticalCandidate[] = [];

  for (const rate of ratesToTest) {
    if (rate <= 0 || rate > maxAchievableRate) continue;

    // Compute extractor cost per resource
    const extractorsPerResource = new Map<string, number>();
    let totalExtractors = 0;

    for (const [resourceId, extractorsPerUnit] of extractorsAtRate1) {
      const needed = Math.ceil(extractorsPerUnit * rate);
      extractorsPerResource.set(resourceId, needed);
      totalExtractors += needed;
    }

    if (totalExtractors > budget) continue;

    // Evaluate with existing optimizer for integer/belt metrics
    const evaluation = evaluateScale(referenceResult, rate, beltSpeed);

    const allInteger = evaluation.integerCount === evaluation.totalBuildings;
    const utilization = totalExtractors / budget;

    // Practical scoring formula
    let score = evaluation.integerRatio * 60;
    if (allInteger) score += 30;
    score -= evaluation.nonCleanBeltCount * 10;
    score += evaluation.cleanBeltRatio * 15;
    if (evaluation.allBeltsClean) score += 10;
    score += utilization * 25;
    if (isPowerOf2(rate)) score += 3;
    if (rate > 0) score -= (1 / rate) * 5;

    candidates.push({
      rate,
      extractorsPerResource,
      totalExtractors,
      utilization,
      integerRatio: evaluation.integerRatio,
      allInteger,
      cleanBeltRatio: evaluation.cleanBeltRatio,
      allBeltsClean: evaluation.allBeltsClean,
      nonCleanBeltCount: evaluation.nonCleanBeltCount,
      buildingCounts: evaluation.buildingCounts,
      score,
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Deduplicate similar rates (within 1% of each other)
  const deduped: PracticalCandidate[] = [];
  for (const candidate of candidates) {
    const isDuplicate = deduped.some(
      (existing) => Math.abs(existing.rate - candidate.rate) / Math.max(existing.rate, 0.001) < 0.01
    );
    if (!isDuplicate) {
      deduped.push(candidate);
    }
  }

  return {
    candidates: deduped.slice(0, 8),
    maxAchievableRate,
    totalExtractorsAtRate1,
  };
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
