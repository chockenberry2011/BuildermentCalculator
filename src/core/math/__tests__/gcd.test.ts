import { describe, it, expect } from 'vitest';
import { gcd, lcm, gcdMultiple, lcmMultiple, isEffectivelyInteger, isPowerOf2, isSplitterFriendlyRatio, isSimpleSplitterRatio, nearestPowerOf2 } from '../gcd';

describe('gcd', () => {
  it('computes gcd of two numbers', () => {
    expect(gcd(12, 8)).toBe(4);
  });

  it('handles coprime numbers', () => {
    expect(gcd(7, 11)).toBe(1);
  });

  it('handles zero', () => {
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(5, 0)).toBe(5);
  });

  it('handles equal numbers', () => {
    expect(gcd(6, 6)).toBe(6);
  });
});

describe('lcm', () => {
  it('computes lcm of two numbers', () => {
    expect(lcm(4, 6)).toBe(12);
  });

  it('handles zero', () => {
    expect(lcm(0, 5)).toBe(0);
  });

  it('handles same number', () => {
    expect(lcm(7, 7)).toBe(7);
  });
});

describe('gcdMultiple', () => {
  it('computes gcd of array', () => {
    expect(gcdMultiple([12, 8, 4])).toBe(4);
  });

  it('returns 0 for empty array', () => {
    expect(gcdMultiple([])).toBe(0);
  });
});

describe('lcmMultiple', () => {
  it('computes lcm of array', () => {
    expect(lcmMultiple([2, 3, 4])).toBe(12);
  });

  it('returns 0 for empty array', () => {
    expect(lcmMultiple([])).toBe(0);
  });
});

describe('isEffectivelyInteger', () => {
  it('detects integer', () => {
    expect(isEffectivelyInteger(5.0)).toBe(true);
  });

  it('detects near-integer', () => {
    expect(isEffectivelyInteger(5.0000000001)).toBe(true);
  });

  it('rejects non-integer', () => {
    expect(isEffectivelyInteger(5.1)).toBe(false);
  });
});

describe('isPowerOf2', () => {
  it('detects powers of 2', () => {
    expect(isPowerOf2(1)).toBe(true);
    expect(isPowerOf2(2)).toBe(true);
    expect(isPowerOf2(4)).toBe(true);
    expect(isPowerOf2(8)).toBe(true);
    expect(isPowerOf2(16)).toBe(true);
  });

  it('rejects non-powers', () => {
    expect(isPowerOf2(0)).toBe(false);
    expect(isPowerOf2(3)).toBe(false);
    expect(isPowerOf2(6)).toBe(false);
    expect(isPowerOf2(-4)).toBe(false);
  });
});

describe('isSplitterFriendlyRatio', () => {
  it('returns true for single element', () => {
    expect(isSplitterFriendlyRatio([5])).toBe(true);
  });

  it('returns true for 1:1 (sum=2)', () => {
    expect(isSplitterFriendlyRatio([1, 1])).toBe(true);
  });

  it('returns true for 1:3 (sum=4)', () => {
    expect(isSplitterFriendlyRatio([1, 3])).toBe(true);
  });

  it('returns true for 3:5 (sum=8)', () => {
    expect(isSplitterFriendlyRatio([3, 5])).toBe(true);
  });

  it('returns false for 3:4 (sum=7)', () => {
    expect(isSplitterFriendlyRatio([3, 4])).toBe(false);
  });

  it('returns false for 1:1:1 (sum=3)', () => {
    expect(isSplitterFriendlyRatio([1, 1, 1])).toBe(false);
  });

  it('returns true for 1:1:2 (sum=4)', () => {
    expect(isSplitterFriendlyRatio([1, 1, 2])).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isSplitterFriendlyRatio([])).toBe(true);
  });
});

describe('isSimpleSplitterRatio', () => {
  it('returns true for empty array', () => {
    expect(isSimpleSplitterRatio([])).toBe(true);
  });

  it('returns true for single element', () => {
    expect(isSimpleSplitterRatio([5])).toBe(true);
  });

  it('returns true for sum=5 (1:4)', () => {
    expect(isSimpleSplitterRatio([1, 4])).toBe(true);
  });

  it('returns true for sum=6 (1:5)', () => {
    expect(isSimpleSplitterRatio([1, 5])).toBe(true);
  });

  it('returns false for sum=7 (3:4)', () => {
    expect(isSimpleSplitterRatio([3, 4])).toBe(false);
  });

  it('returns false for sum=7 (1:6)', () => {
    expect(isSimpleSplitterRatio([1, 6])).toBe(false);
  });

  it('returns true for 1:2 (sum=3)', () => {
    expect(isSimpleSplitterRatio([1, 2])).toBe(true);
  });

  it('returns true for 2:3 (sum=5)', () => {
    expect(isSimpleSplitterRatio([2, 3])).toBe(true);
  });

  it('returns true for 1:1:1 (sum=3)', () => {
    expect(isSimpleSplitterRatio([1, 1, 1])).toBe(true);
  });

  it('returns true for 1:2:3 (sum=6)', () => {
    expect(isSimpleSplitterRatio([1, 2, 3])).toBe(true);
  });

  it('returns false for 1:3:4 (sum=8) with default threshold', () => {
    expect(isSimpleSplitterRatio([1, 3, 4])).toBe(false);
  });

  it('respects custom maxSum threshold', () => {
    // sum=7, maxSum=8 → true
    expect(isSimpleSplitterRatio([3, 4], 8)).toBe(true);
    // sum=5, maxSum=4 → false
    expect(isSimpleSplitterRatio([2, 3], 4)).toBe(false);
  });
});

describe('nearestPowerOf2', () => {
  it('returns exact power', () => {
    expect(nearestPowerOf2(8)).toBe(8);
  });

  it('rounds to nearest power', () => {
    expect(nearestPowerOf2(5)).toBe(4);
    expect(nearestPowerOf2(7)).toBe(8);
  });

  it('handles edge cases', () => {
    expect(nearestPowerOf2(0)).toBe(1);
    expect(nearestPowerOf2(1)).toBe(1);
  });
});
