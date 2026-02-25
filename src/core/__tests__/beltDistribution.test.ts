import { describe, it, expect } from 'vitest';
import { Rational } from '../math/rational';
import { getBeltDistribution } from '../beltDistribution';

describe('getBeltDistribution', () => {
  it('returns null for single belt', () => {
    expect(getBeltDistribution(new Rational(5), 1)).toBeNull();
    expect(getBeltDistribution(new Rational(5), 0)).toBeNull();
  });

  it('17 buildings / 2 belts → 8 + 1/2 per belt', () => {
    const dist = getBeltDistribution(new Rational(17), 2)!;
    expect(dist).not.toBeNull();
    expect(dist.beltsNeeded).toBe(2);
    expect(dist.buildingsPerBelt.numerator).toBe(17);
    expect(dist.buildingsPerBelt.denominator).toBe(2);
    expect(dist.splitInfo).not.toBeNull();
    expect(dist.splitInfo!.fullBuildings).toBe(8);
    expect(dist.splitInfo!.splitNumerator).toBe(1);
    expect(dist.splitInfo!.splitDenominator).toBe(2);
    expect(dist.shortLabel).toBe('8 + 1/2 /belt');
  });

  it('17 buildings / 3 belts → 5 + 2/3 per belt', () => {
    const dist = getBeltDistribution(new Rational(17), 3)!;
    expect(dist).not.toBeNull();
    expect(dist.buildingsPerBelt.numerator).toBe(17);
    expect(dist.buildingsPerBelt.denominator).toBe(3);
    expect(dist.splitInfo!.fullBuildings).toBe(5);
    expect(dist.splitInfo!.splitNumerator).toBe(2);
    expect(dist.splitInfo!.splitDenominator).toBe(3);
    expect(dist.shortLabel).toBe('5 + 2/3 /belt');
  });

  it('even division: 6 buildings / 2 belts → 3 per belt, no splitInfo', () => {
    const dist = getBeltDistribution(new Rational(6), 2)!;
    expect(dist).not.toBeNull();
    expect(dist.buildingsPerBelt.numerator).toBe(3);
    expect(dist.buildingsPerBelt.denominator).toBe(1);
    expect(dist.splitInfo).toBeNull();
    expect(dist.shortLabel).toBe('3 /belt');
  });

  it('fractional building count: 16/3 buildings / 2 belts → 8/3 per belt', () => {
    const dist = getBeltDistribution(new Rational(16, 3), 2)!;
    expect(dist).not.toBeNull();
    expect(dist.buildingsPerBelt.numerator).toBe(8);
    expect(dist.buildingsPerBelt.denominator).toBe(3);
    expect(dist.splitInfo!.fullBuildings).toBe(2);
    expect(dist.splitInfo!.splitNumerator).toBe(2);
    expect(dist.splitInfo!.splitDenominator).toBe(3);
    expect(dist.shortLabel).toBe('2 + 2/3 /belt');
  });

  it('tooltip includes building count and belt info', () => {
    const dist = getBeltDistribution(new Rational(17), 2)!;
    expect(dist.tooltip).toContain('17');
    expect(dist.tooltip).toContain('2 belts');
    expect(dist.tooltip).toContain('per belt');
  });
});
