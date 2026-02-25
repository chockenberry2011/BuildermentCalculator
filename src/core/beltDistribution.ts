import { Rational } from './math/rational';
import { getSplitInfo, SplitInfo } from './splitInfo';

export interface BeltDistribution {
  beltsNeeded: number;
  buildingsPerBelt: Rational;
  splitInfo: SplitInfo | null;
  shortLabel: string;
  tooltip: string;
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
