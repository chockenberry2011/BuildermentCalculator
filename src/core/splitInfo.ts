import { Rational } from './math/rational';
import { gcd, lcm } from './math/gcd';

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
 *
 * When outputQuantity > 1, converts the split into complete batches.
 * Items exit the building in groups of outputQuantity. Splitters can
 * only route whole groups, so we floor the numerator to the nearest
 * multiple of oQ and simplify. E.g. 3/8 with oQ=2 → 1 pair of 4 → 1/4.
 */
export function getSplitInfo(count: Rational, outputQuantity?: number): SplitInfo | null {
  if (count.isInteger()) return null;

  const { numerator, denominator } = count;
  const fullBuildings = Math.floor(numerator / denominator);
  const splitNumerator = numerator % denominator;
  const actualBuildings = fullBuildings + (splitNumerator > 0 ? 1 : 0);

  if (splitNumerator === 0) return null;

  const oQ = outputQuantity ?? 1;
  let displayNum = splitNumerator;
  let displayDenom = denominator;

  if (oQ > 1) {
    // Scale so denominator is a multiple of oQ, then convert to batches.
    const scaleFactor = lcm(denominator, oQ) / denominator;
    const scaledNum = splitNumerator * scaleFactor;
    const scaledDenom = denominator * scaleFactor;

    const batchNum = Math.floor(scaledNum / oQ);
    const batchDenom = scaledDenom / oQ;

    if (batchNum > 0) {
      const g = gcd(batchNum, batchDenom);
      displayNum = batchNum / g;
      displayDenom = batchDenom / g;
    }
    // batchNum === 0: fraction too small for a whole batch, keep original
  }

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
