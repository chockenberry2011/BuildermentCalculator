import { Rational } from './math/rational';
import { getSplitInfo, SplitInfo } from './splitInfo';

/** Format a Rational as a compact decimal: integers as-is, otherwise up to 2 decimal places with trailing zeros trimmed. */
function formatRationalCompact(r: Rational): string {
  if (r.isInteger()) return r.toNumber().toString();
  const n = r.toNumber();
  // Try 1 decimal place first
  const s1 = n.toFixed(1);
  if (parseFloat(s1) === n) return s1;
  // Fall back to 2 decimal places, trim trailing zeros
  return parseFloat(n.toFixed(2)).toString();
}

export interface BeltDistribution {
  beltsNeeded: number;
  buildingsPerBelt: Rational;
  splitInfo: SplitInfo | null;
  shortLabel: string;
  tooltip: string;
}

export interface TargetBuildingDistribution {
  buildingsPerTarget: Rational;
  fullTargetBuildings: number;
  fullTargetSourceCount: Rational;
  partialTargetFraction: Rational | null;
  partialTargetSourceCount: Rational | null;
  shortLabel: string;
  tooltip: string;
}

/**
 * For a source→target edge, compute how many source buildings feed each target building.
 * E.g. 60 extractors → 3.75 furnaces = 16 extractors per furnace.
 * Returns null when target is zero, target is 1, or source is zero.
 */
export function getTargetBuildingDistribution(
  sourceBuildingCount: Rational,
  targetBuildingCount: Rational,
  targetBuildingName: string
): TargetBuildingDistribution | null {
  if (targetBuildingCount.isZero() || sourceBuildingCount.isZero()) return null;
  if (targetBuildingCount.equals(new Rational(1))) return null;

  const buildingsPerTarget = sourceBuildingCount.divide(targetBuildingCount);
  const targetSplit = getSplitInfo(targetBuildingCount);

  let fullTargetBuildings: number;
  let fullTargetSourceCount: Rational;
  let partialTargetFraction: Rational | null = null;
  let partialTargetSourceCount: Rational | null = null;

  if (targetSplit) {
    fullTargetBuildings = targetSplit.fullBuildings;
    // Each full target gets exactly buildingsPerTarget sources
    fullTargetSourceCount = buildingsPerTarget;
    // Partial target fraction
    partialTargetFraction = new Rational(targetSplit.splitNumerator, targetSplit.splitDenominator);
    // Sources for partial target = partialFraction × buildingsPerTarget
    partialTargetSourceCount = partialTargetFraction.multiply(buildingsPerTarget);
  } else {
    // Integer target count
    fullTargetBuildings = targetBuildingCount.toNumber();
    fullTargetSourceCount = buildingsPerTarget;
  }

  const targetNameLower = targetBuildingName.toLowerCase();

  const displayValue = formatRationalCompact(buildingsPerTarget);
  const shortLabel = `${displayValue} /${targetNameLower}`;

  const perTargetDisplay = displayValue;

  let tooltip = `${sourceBuildingCount.toDecimalString()} buildings across ${targetBuildingCount.toDecimalString()} ${targetNameLower}s: ${perTargetDisplay} /${targetNameLower}.`;
  if (targetSplit && partialTargetSourceCount) {
    const fullDisplay = fullTargetSourceCount.isInteger()
      ? fullTargetSourceCount.toNumber().toString()
      : fullTargetSourceCount.toDecimalString();
    const partialDisplay = partialTargetSourceCount.isInteger()
      ? partialTargetSourceCount.toNumber().toString()
      : partialTargetSourceCount.toDecimalString();
    tooltip += ` ${fullTargetBuildings} full × ${fullDisplay} + 1 partial (${targetSplit.splitNumerator}/${targetSplit.splitDenominator}) × ${partialDisplay}`;
  }

  return {
    buildingsPerTarget,
    fullTargetBuildings,
    fullTargetSourceCount,
    partialTargetFraction,
    partialTargetSourceCount,
    shortLabel,
    tooltip,
  };
}

export interface PhysicalBeltInfo {
  wiringGroups: number;      // Physical wiring connections
  physicalBelts: number;     // Total belts (groups × per-group belt needs)
  throughputBelts: number;   // Original Math.ceil(rate/beltSpeed)
  displayBelts: number;      // max(physicalBelts, throughputBelts)
}

/**
 * Compute physical belt count based on wiring groups from target building distribution.
 * Returns null if dist is null — caller falls back to throughput-based.
 */
export function getPhysicalBeltCount(
  dist: TargetBuildingDistribution | null,
  rate: number,
  beltSpeed: number
): PhysicalBeltInfo | null {
  if (!dist) return null;

  const throughputBelts = Math.ceil(rate / beltSpeed);
  const isFractionalRatio = !dist.buildingsPerTarget.isInteger();

  const totalTargetCount = dist.fullTargetBuildings +
    (dist.partialTargetFraction ? dist.partialTargetFraction.toNumber() : 0);

  const ratePerTargetBuilding = totalTargetCount > 0 ? rate / totalTargetCount : 0;

  let wiringGroups: number;
  let physicalBelts: number;

  if (isFractionalRatio) {
    const den = Number(dist.buildingsPerTarget.denominator);
    const completeGroups = Math.floor(dist.fullTargetBuildings / den);
    const remainingFull = dist.fullTargetBuildings % den;
    const hasPartial = dist.partialTargetFraction !== null;

    wiringGroups = completeGroups + (remainingFull > 0 ? 1 : 0) + (hasPartial ? 1 : 0);

    const completeGroupRate = den * ratePerTargetBuilding;
    physicalBelts = completeGroups * Math.ceil(completeGroupRate / beltSpeed);
    if (remainingFull > 0) {
      physicalBelts += Math.ceil(remainingFull * ratePerTargetBuilding / beltSpeed);
    }
    if (hasPartial) {
      physicalBelts += Math.ceil(dist.partialTargetFraction!.toNumber() * ratePerTargetBuilding / beltSpeed);
    }
  } else {
    const hasPartial = dist.partialTargetFraction !== null;
    wiringGroups = dist.fullTargetBuildings + (hasPartial ? 1 : 0);

    physicalBelts = dist.fullTargetBuildings * Math.ceil(ratePerTargetBuilding / beltSpeed);
    if (hasPartial) {
      physicalBelts += Math.ceil(dist.partialTargetFraction!.toNumber() * ratePerTargetBuilding / beltSpeed);
    }
  }

  // Only inflate belt count when throughput already requires multiple belts.
  // When 1 belt has enough capacity, players can use a single belt with splitters.
  const displayBelts = throughputBelts > 1 ? Math.max(physicalBelts, throughputBelts) : throughputBelts;

  return { wiringGroups, physicalBelts, throughputBelts, displayBelts };
}

export interface FeedingPattern {
  sourcePerGroup: number;      // n
  targetPerGroup: number;      // d
  dedicatedPerTarget: number;  // floor(n/d)
  sharedSources: number;       // n mod d
  splitFraction: string;       // "1/d" display
  groupCount: number;
  remainingTargets: number;    // fullTargetBuildings % d
  hasPartial: boolean;
  partialTargetFraction: Rational | null;
  partialSourceCount: Rational | null;
}

/**
 * Compute the source-to-target feeding pattern from a TargetBuildingDistribution.
 * Shows how source buildings physically wire to target buildings:
 * dedicated (1:1) vs shared (split across multiple targets).
 */
export function computeFeedingPattern(
  dist: TargetBuildingDistribution
): FeedingPattern {
  const n = Number(dist.buildingsPerTarget.numerator);
  const d = Number(dist.buildingsPerTarget.denominator);

  const dedicatedPerTarget = Math.floor(n / d);
  const sharedSources = n % d;
  const splitFraction = d > 1 ? `1/${d}` : 'n/a';

  const groupCount = Math.floor(dist.fullTargetBuildings / d);
  const remainingTargets = dist.fullTargetBuildings % d;

  const hasPartial = dist.partialTargetFraction !== null;

  return {
    sourcePerGroup: n,
    targetPerGroup: d,
    dedicatedPerTarget,
    sharedSources,
    splitFraction,
    groupCount,
    remainingTargets,
    hasPartial,
    partialTargetFraction: dist.partialTargetFraction,
    partialSourceCount: dist.partialTargetSourceCount,
  };
}

/**
 * For a multi-belt connection, compute how to distribute buildings across belts.
 * E.g. 17 buildings on 2 belts → 8 + 1/2 per belt.
 * Returns null when beltsNeeded <= 1 (trivial single-belt case).
 */
export function getBeltDistribution(
  buildingCount: Rational,
  beltsNeeded: number
): BeltDistribution | null {
  if (beltsNeeded <= 1) return null;

  const buildingsPerBelt = buildingCount.divide(new Rational(beltsNeeded));
  const splitInfo = getSplitInfo(buildingsPerBelt);

  const shortLabel = splitInfo
    ? `${splitInfo.shortLabel} /belt`
    : `${buildingsPerBelt.toNumber() % 1 === 0 ? buildingsPerBelt.toNumber() : buildingsPerBelt.toDecimalString()} /belt`;

  const perBeltDisplay = splitInfo
    ? splitInfo.shortLabel
    : String(buildingsPerBelt.toNumber());

  const tooltip =
    `${buildingCount.toDecimalString()} buildings across ${beltsNeeded} belts: ` +
    `${perBeltDisplay} per belt.` +
    (splitInfo
      ? ` Each belt: ${splitInfo.tooltip.charAt(0).toLowerCase()}${splitInfo.tooltip.slice(1)}`
      : '');

  return {
    beltsNeeded,
    buildingsPerBelt,
    splitInfo,
    shortLabel,
    tooltip,
  };
}
