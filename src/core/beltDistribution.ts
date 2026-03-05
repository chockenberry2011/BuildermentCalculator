import { Rational } from './math/rational';
import { getSplitInfo, SplitInfo } from './splitInfo';

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

  const perTargetDisplay = buildingsPerTarget.isInteger()
    ? buildingsPerTarget.toNumber().toString()
    : buildingsPerTarget.toDecimalString();

  const shortLabel = `${perTargetDisplay} /${targetBuildingName.toLowerCase()}`;

  let tooltip = `${sourceBuildingCount.toDecimalString()} buildings across ${targetBuildingCount.toDecimalString()} ${targetBuildingName.toLowerCase()}s: ${perTargetDisplay} per ${targetBuildingName.toLowerCase()}.`;
  if (targetSplit && partialTargetSourceCount) {
    const partialDisplay = partialTargetSourceCount.isInteger()
      ? partialTargetSourceCount.toNumber().toString()
      : partialTargetSourceCount.toDecimalString();
    const fullDisplay = fullTargetSourceCount.isInteger()
      ? fullTargetSourceCount.toNumber().toString()
      : fullTargetSourceCount.toDecimalString();
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
