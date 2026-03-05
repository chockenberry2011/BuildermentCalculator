import { Rational } from './math/rational';

export interface SplitInfo {
  actualBuildings: number;
  fullBuildings: number;
  splitNumerator: number;
  splitDenominator: number;
  shortLabel: string;
  tooltip: string;
}

/**
 * For a fractional building count like 16/3, extract the practical
 * splitter layout: build 6, 5 at full output, last one splits 1-of-3.
 * Returns null for integer counts.
 */
export function getSplitInfo(count: Rational): SplitInfo | null {
  if (count.isInteger()) return null;

  const { numerator, denominator } = count;
  const fullBuildings = Math.floor(numerator / denominator);
  const splitNumerator = numerator % denominator;
  const actualBuildings = fullBuildings + (splitNumerator > 0 ? 1 : 0);

  if (splitNumerator === 0) return null;

  const displayNum = splitNumerator;
  const displayDenom = denominator;

  const shortLabel = fullBuildings > 0
    ? `${fullBuildings} + ${displayNum}/${displayDenom}`
    : `${displayNum}/${displayDenom}`;

  const tooltip =
    `Build ${actualBuildings}. ` +
    `${fullBuildings} at full output, ` +
    `1 splits ${displayNum} of ${displayDenom} here.`;

  return {
    actualBuildings,
    fullBuildings,
    splitNumerator: displayNum,
    splitDenominator: displayDenom,
    shortLabel,
    tooltip,
  };
}
