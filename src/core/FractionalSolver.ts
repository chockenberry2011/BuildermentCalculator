import { ProductionResult } from './ProductionCalculator';
import { BuildingType, BUILDINGS } from '../data/buildings';
import { isCleanBeltMultiple } from '../data/belts';
import { isEffectivelyInteger } from './math/gcd';

export interface ScalingSuggestion {
  targetRate: number;
  targetBuildingCount: number;
  otherBuildingsStillInteger: boolean;
  beltsStillClean: boolean;
}

export interface FractionalProposal {
  buildingType: BuildingType;
  buildingName: string;
  currentCount: number;
  scaleUp: ScalingSuggestion | null;
  scaleDown: ScalingSuggestion | null;
  overproductionPercent: number;
}

/**
 * For each fractional building count, generate proposals to scale to integer counts.
 */
export function generateProposals(
  result: ProductionResult,
  currentRate: number,
  beltSpeed: number
): FractionalProposal[] {
  const proposals: FractionalProposal[] = [];

  for (const [buildingType, count] of result.buildingSummary) {
    const countValue = count.toNumber();

    // Skip if already integer
    if (isEffectivelyInteger(countValue)) {
      continue;
    }

    const floor = Math.floor(countValue);
    const ceil = Math.ceil(countValue);

    // Calculate scale factors to reach integer counts
    const scaleDownFactor = floor > 0 ? floor / countValue : null;
    const scaleUpFactor = ceil / countValue;

    const scaleDown = scaleDownFactor !== null ? evaluateScale(
      result,
      currentRate,
      scaleDownFactor,
      floor,
      beltSpeed
    ) : null;

    const scaleUp = evaluateScale(
      result,
      currentRate,
      scaleUpFactor,
      ceil,
      beltSpeed
    );

    // Calculate overproduction if user just builds ceil buildings
    const overproductionPercent = ((ceil / countValue) - 1) * 100;

    proposals.push({
      buildingType,
      buildingName: BUILDINGS[buildingType]?.name ?? buildingType,
      currentCount: countValue,
      scaleUp,
      scaleDown,
      overproductionPercent,
    });
  }

  return proposals;
}

/**
 * Evaluate what happens at a scaled rate.
 */
function evaluateScale(
  result: ProductionResult,
  currentRate: number,
  scaleFactor: number,
  targetCount: number,
  beltSpeed: number
): ScalingSuggestion {
  const targetRate = currentRate * scaleFactor;

  // Check if other buildings stay integer
  let otherBuildingsStillInteger = true;
  for (const [_buildingType, count] of result.buildingSummary) {
    const scaledCount = count.toNumber() * scaleFactor;
    if (!isEffectivelyInteger(scaledCount)) {
      otherBuildingsStillInteger = false;
      break;
    }
  }

  // Check if belts stay clean
  const beltsStillClean = checkBeltsClean(result, scaleFactor, beltSpeed);

  return {
    targetRate,
    targetBuildingCount: targetCount,
    otherBuildingsStillInteger,
    beltsStillClean,
  };
}

/**
 * Check if all belt connections would be clean at a given scale.
 */
function checkBeltsClean(
  result: ProductionResult,
  scaleFactor: number,
  beltSpeed: number
): boolean {
  function processNode(node: typeof result.root): boolean {
    for (const child of node.children) {
      const throughput = child.ratePerMinute.toNumber() * scaleFactor;
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
