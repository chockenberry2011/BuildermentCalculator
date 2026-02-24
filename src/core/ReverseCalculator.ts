import {
  calculateProduction,
  RecipeSelections,
  BuildingLevels,
} from './ProductionCalculator';
import { BuildingType, EXTRACTOR_RATES } from '../data/buildings';
import { ITEMS } from '../data/items';
import { isCleanBeltMultiple } from '../data/belts';
import { isEffectivelyInteger } from './math/gcd';

export interface ResourceConstraint {
  resourceId: string;
  extractorCount: number;
}

export interface ReverseResult {
  maxOutputRate: number;
  bottleneck: {
    resourceId: string;
    resourceName: string;
    suggestion: string;
  } | null;
  buildingRequirements: Map<BuildingType, number>;
  resourceUtilization: Map<string, { used: number; available: number }>;
  allBuildingsInteger: boolean;
  allBeltsClean: boolean;
}

/**
 * Calculate maximum achievable output rate given resource constraints.
 *
 * Algorithm:
 * 1. Calculate available resource rate = extractorCount * ratePerExtractor
 * 2. Get unit requirements: calculateProduction(targetItem, rate=1)
 * 3. For each raw resource needed: maxScale = availableRate / requiredRatePerUnit
 * 4. Bottleneck = min(maxScale) across all resources
 * 5. Final output = bottleneck rate
 */
export function calculateFromResources(
  targetItemId: string,
  constraints: ResourceConstraint[],
  recipeSelections: RecipeSelections,
  buildingLevels: BuildingLevels,
  beltSpeed: number
): ReverseResult {
  // Build a map of available rates from constraints
  const extractorLevel = buildingLevels.get('extractor') ?? 1;
  const ratePerExtractor = EXTRACTOR_RATES[extractorLevel - 1];

  const availableRates = new Map<string, number>();
  for (const constraint of constraints) {
    const available = constraint.extractorCount * ratePerExtractor;
    availableRates.set(constraint.resourceId, available);
  }

  // Calculate production at rate=1 to find resource requirements per unit
  const unitResult = calculateProduction(
    targetItemId,
    1,
    recipeSelections,
    buildingLevels
  );

  // Find the bottleneck resource
  let minScale = Infinity;
  let bottleneckResourceId: string | null = null;

  for (const [resourceId, rate] of unitResult.rawResources) {
    const requiredPerUnit = rate.toNumber();
    if (requiredPerUnit <= 0) continue;

    const available = availableRates.get(resourceId) ?? 0;

    if (available <= 0) {
      // This resource is needed but not provided - infinite bottleneck
      minScale = 0;
      bottleneckResourceId = resourceId;
      break;
    }

    const maxScale = available / requiredPerUnit;
    if (maxScale < minScale) {
      minScale = maxScale;
      bottleneckResourceId = resourceId;
    }
  }

  // Handle edge case: no resources needed or no valid scale
  if (!Number.isFinite(minScale) || minScale <= 0) {
    return {
      maxOutputRate: 0,
      bottleneck: bottleneckResourceId ? {
        resourceId: bottleneckResourceId,
        resourceName: ITEMS[bottleneckResourceId]?.name ?? bottleneckResourceId,
        suggestion: `No ${ITEMS[bottleneckResourceId]?.name ?? bottleneckResourceId} extractors provided`,
      } : null,
      buildingRequirements: new Map(),
      resourceUtilization: new Map(),
      allBuildingsInteger: false,
      allBeltsClean: false,
    };
  }

  const maxOutputRate = minScale;

  // Calculate actual production at max rate
  const actualResult = calculateProduction(
    targetItemId,
    maxOutputRate,
    recipeSelections,
    buildingLevels
  );

  // Build building requirements map
  const buildingRequirements = new Map<BuildingType, number>();
  for (const [buildingType, count] of actualResult.buildingSummary) {
    buildingRequirements.set(buildingType, count.toNumber());
  }

  // Calculate resource utilization
  const resourceUtilization = new Map<string, { used: number; available: number }>();
  for (const [resourceId, rate] of actualResult.rawResources) {
    const used = rate.toNumber();
    const available = availableRates.get(resourceId) ?? 0;
    resourceUtilization.set(resourceId, { used, available });
  }

  // Check if all buildings are integer
  let allBuildingsInteger = true;
  for (const count of actualResult.buildingSummary.values()) {
    if (!isEffectivelyInteger(count.toNumber())) {
      allBuildingsInteger = false;
      break;
    }
  }

  // Check if all belts are clean
  const allBeltsClean = checkAllBeltsClean(actualResult, beltSpeed);

  // Generate bottleneck suggestion
  let bottleneck: ReverseResult['bottleneck'] = null;
  if (bottleneckResourceId) {
    const bottleneckName = ITEMS[bottleneckResourceId]?.name ?? bottleneckResourceId;
    const currentAvailable = availableRates.get(bottleneckResourceId) ?? 0;
    const requiredPerUnit = unitResult.rawResources.get(bottleneckResourceId)?.toNumber() ?? 0;

    // Calculate how many more extractors needed for 20% more output
    const targetIncrease = 0.2;
    const newRate = maxOutputRate * (1 + targetIncrease);
    const newRequired = newRate * requiredPerUnit;
    const additionalNeeded = Math.ceil((newRequired - currentAvailable) / ratePerExtractor);

    bottleneck = {
      resourceId: bottleneckResourceId,
      resourceName: bottleneckName,
      suggestion: additionalNeeded > 0
        ? `Add ${additionalNeeded} more extractor${additionalNeeded > 1 ? 's' : ''} to increase output by ${Math.round(targetIncrease * 100)}%`
        : `${bottleneckName} is at capacity`,
    };
  }

  return {
    maxOutputRate,
    bottleneck,
    buildingRequirements,
    resourceUtilization,
    allBuildingsInteger,
    allBeltsClean,
  };
}

/**
 * Check if all belt connections are clean multiples.
 */
function checkAllBeltsClean(
  result: ReturnType<typeof calculateProduction>,
  beltSpeed: number
): boolean {
  function processNode(node: typeof result.root): boolean {
    for (const child of node.children) {
      const throughput = child.ratePerMinute.toNumber();
      if (!isCleanBeltMultiple(throughput, beltSpeed)) {
        return false;
      }
      if (!processNode(child)) {
        return false;
      }
    }
    return true;
  }

  return processNode(result.root);
}

/**
 * Get all raw resources required for a target item.
 */
export function getRequiredResources(
  targetItemId: string,
  recipeSelections: RecipeSelections,
  buildingLevels: BuildingLevels
): string[] {
  const result = calculateProduction(
    targetItemId,
    1,
    recipeSelections,
    buildingLevels
  );

  return Array.from(result.rawResources.keys());
}
