import { describe, it, expect } from 'vitest';
import { Rational } from '../math/rational';
import { getSplitInfo } from '../splitInfo';

describe('getSplitInfo', () => {
  it('returns null for integer counts', () => {
    expect(getSplitInfo(new Rational(6, 1))).toBeNull();
    expect(getSplitInfo(new Rational(1, 1))).toBeNull();
    expect(getSplitInfo(new Rational(12, 4))).toBeNull(); // reduces to 3/1
  });

  it('handles 16/3 (glass example)', () => {
    const info = getSplitInfo(new Rational(16, 3))!;
    expect(info).not.toBeNull();
    expect(info.actualBuildings).toBe(6);
    expect(info.fullBuildings).toBe(5);
    expect(info.splitNumerator).toBe(1);
    expect(info.splitDenominator).toBe(3);
    expect(info.shortLabel).toBe('5 + 1/3');
    expect(info.tooltip).toContain('Build 6');
    expect(info.tooltip).toContain('5 at full output');
    expect(info.tooltip).toContain('1 of 3');
  });

  it('handles 3/2 (workshops)', () => {
    const info = getSplitInfo(new Rational(3, 2))!;
    expect(info).not.toBeNull();
    expect(info.actualBuildings).toBe(2);
    expect(info.fullBuildings).toBe(1);
    expect(info.splitNumerator).toBe(1);
    expect(info.splitDenominator).toBe(2);
    expect(info.shortLabel).toBe('1 + 1/2');
  });

  it('handles count less than 1', () => {
    const info = getSplitInfo(new Rational(2, 3))!;
    expect(info).not.toBeNull();
    expect(info.actualBuildings).toBe(1);
    expect(info.fullBuildings).toBe(0);
    expect(info.splitNumerator).toBe(2);
    expect(info.splitDenominator).toBe(3);
    expect(info.shortLabel).toBe('2/3');
  });

  it('returns null for near-integer via Rational reduction', () => {
    // 8/4 reduces to 2/1, which is integer
    expect(getSplitInfo(new Rational(8, 4))).toBeNull();
  });

  it('handles 15/8 correctly for multi-output recipes (copper wire)', () => {
    // Copper wire (oQ=2) at 11.25/min needs 15/8 workshops.
    // The split badge should show the raw building fraction 7/8, not a batch-converted value.
    const info = getSplitInfo(new Rational(15, 8))!;
    expect(info).not.toBeNull();
    expect(info.actualBuildings).toBe(2);
    expect(info.fullBuildings).toBe(1);
    expect(info.splitNumerator).toBe(7);
    expect(info.splitDenominator).toBe(8);
    expect(info.shortLabel).toBe('1 + 7/8');
  });
});
