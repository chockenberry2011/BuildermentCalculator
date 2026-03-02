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

  describe('batch-aligned fractions (outputQuantity > 1)', () => {
    it('converts 3/8 with oQ=2 to 1/4 (1 pair of 4 pairs)', () => {
      const info = getSplitInfo(new Rational(3, 8), 2)!;
      expect(info).not.toBeNull();
      expect(info.splitNumerator).toBe(1);
      expect(info.splitDenominator).toBe(4);
      expect(info.shortLabel).toBe('1/4');
    });

    it('converts 3/4 with oQ=2 to 1/2 (1 pair of 2 pairs)', () => {
      const info = getSplitInfo(new Rational(3, 4), 2)!;
      expect(info).not.toBeNull();
      expect(info.splitNumerator).toBe(1);
      expect(info.splitDenominator).toBe(2);
      expect(info.shortLabel).toBe('1/2');
    });

    it('keeps 1/2 with oQ=2 unchanged (fraction too small for whole batch)', () => {
      const info = getSplitInfo(new Rational(1, 2), 2)!;
      expect(info).not.toBeNull();
      expect(info.splitNumerator).toBe(1);
      expect(info.splitDenominator).toBe(2);
      expect(info.shortLabel).toBe('1/2');
    });

    it('converts 1/3 with oQ=10 to 1/3 (1 batch of 3 batches)', () => {
      const info = getSplitInfo(new Rational(1, 3), 10)!;
      expect(info).not.toBeNull();
      expect(info.splitNumerator).toBe(1);
      expect(info.splitDenominator).toBe(3);
      expect(info.shortLabel).toBe('1/3');
    });

    it('leaves fraction unchanged with oQ=1', () => {
      const info = getSplitInfo(new Rational(3, 4), 1)!;
      expect(info.splitNumerator).toBe(3);
      expect(info.splitDenominator).toBe(4);
      expect(info.shortLabel).toBe('3/4');
    });

    it('leaves fraction unchanged with oQ undefined', () => {
      const info = getSplitInfo(new Rational(3, 4))!;
      expect(info.splitNumerator).toBe(3);
      expect(info.splitDenominator).toBe(4);
      expect(info.shortLabel).toBe('3/4');
    });

    it('preserves actualBuildings from original count', () => {
      // 3/8 → build 1, but batch fraction is 1/4
      const info = getSplitInfo(new Rational(3, 8), 2)!;
      expect(info.actualBuildings).toBe(1);
      expect(info.fullBuildings).toBe(0);
    });
  });
});
