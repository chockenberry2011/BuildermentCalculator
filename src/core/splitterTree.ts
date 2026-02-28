import { gcdMultiple, isSplitterFriendlyRatio } from './math/gcd';

export type SplitterTarget =
  | { type: 'splitter'; index: number }
  | { type: 'output'; label: string; parts: number };

export interface SplitterStep {
  index: number;
  left: SplitterTarget;
  right: SplitterTarget;
}

export interface SplitterTreeInfo {
  ratioParts: { label: string; parts: number }[];
  totalParts: number;
  isSplitterFriendly: boolean;
  steps: SplitterStep[];
  ratioLabel: string;
}

interface Consumer {
  label: string;
  parts: number;
}

/**
 * Build a binary splitter tree from consumer ratio parts.
 *
 * Given consumers with integer ratio parts that sum to a power of 2,
 * produces a list of splitter steps describing how to wire binary
 * splitters to achieve the desired distribution.
 *
 * Algorithm: recursive halving — partition consumers into two groups
 * each summing to N/2, then recurse on groups with >1 consumer.
 */
export function buildSplitterTree(consumers: Consumer[]): SplitterTreeInfo {
  const parts = consumers.map((c) => c.parts);
  const totalParts = parts.reduce((a, b) => a + b, 0);
  const ratioLabel = parts.join(':');
  const friendly = isSplitterFriendlyRatio(parts);

  if (consumers.length <= 1 || !friendly) {
    return {
      ratioParts: consumers.map((c) => ({ label: c.label, parts: c.parts })),
      totalParts,
      isSplitterFriendly: friendly,
      steps: [],
      ratioLabel,
    };
  }

  const steps: SplitterStep[] = [];
  let nextIndex = 1;

  function buildTree(group: Consumer[]): SplitterTarget {
    if (group.length === 1) {
      return { type: 'output', label: group[0].label, parts: group[0].parts };
    }

    const groupSum = group.reduce((a, c) => a + c.parts, 0);
    const half = groupSum / 2;

    // Greedy partition: sort descending, assign each to lighter side
    const sorted = [...group].sort((a, b) => b.parts - a.parts);
    const leftGroup: Consumer[] = [];
    const rightGroup: Consumer[] = [];
    let leftSum = 0;
    let rightSum = 0;

    for (const consumer of sorted) {
      if (leftSum <= rightSum) {
        leftGroup.push(consumer);
        leftSum += consumer.parts;
      } else {
        rightGroup.push(consumer);
        rightSum += consumer.parts;
      }
    }

    // Both sides must sum to half for a valid binary split
    // If greedy partition doesn't achieve equal halves, the ratio
    // may not be achievable with simple binary splitters.
    // For power-of-2 sums this should always work.
    if (leftSum !== half || rightSum !== half) {
      // Fallback: try all 2^n subsets (only for small n)
      const balanced = findBalancedPartition(group, half);
      if (balanced) {
        leftGroup.length = 0;
        rightGroup.length = 0;
        const inLeft = new Set(balanced);
        for (let i = 0; i < group.length; i++) {
          if (inLeft.has(i)) {
            leftGroup.push(group[i]);
          } else {
            rightGroup.push(group[i]);
          }
        }
      }
    }

    const index = nextIndex++;
    const left = buildTree(leftGroup);
    const right = buildTree(rightGroup);
    steps.push({ index, left, right });
    return { type: 'splitter', index };
  }

  buildTree(consumers);

  return {
    ratioParts: consumers.map((c) => ({ label: c.label, parts: c.parts })),
    totalParts,
    isSplitterFriendly: true,
    steps,
    ratioLabel,
  };
}

/**
 * Find a subset of indices whose parts sum to exactly `target`.
 * Returns the indices in the left group, or null if impossible.
 */
function findBalancedPartition(group: Consumer[], target: number): number[] | null {
  const n = group.length;
  if (n > 20) return null; // safety limit

  for (let mask = 1; mask < (1 << n) - 1; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) sum += group[i].parts;
    }
    if (sum === target) {
      const indices: number[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) indices.push(i);
      }
      return indices;
    }
  }
  return null;
}

/**
 * Convenience: compute integer ratio parts from raw rate numbers.
 * Scales rates to avoid float precision issues, then divides by GCD.
 */
export function ratesToParts(rates: number[]): number[] {
  const scaled = rates.map((r) => Math.round(r * 1000000));
  const g = gcdMultiple(scaled);
  return g > 0 ? scaled.map((r) => r / g) : scaled;
}
