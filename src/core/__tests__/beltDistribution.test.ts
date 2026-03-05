import { describe, it, expect } from 'vitest';
import { Rational } from '../math/rational';
import { getBeltDistribution, getTargetBuildingDistribution } from '../beltDistribution';

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

describe('getTargetBuildingDistribution', () => {
  it('60 extractors / 3.75 furnaces → 16/furnace with partial breakdown', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(60),
      new Rational(15, 4), // 3.75
      'Furnace'
    )!;
    expect(dist).not.toBeNull();
    expect(dist.buildingsPerTarget.toNumber()).toBe(16);
    expect(dist.fullTargetBuildings).toBe(3);
    expect(dist.partialTargetFraction).not.toBeNull();
    expect(dist.partialTargetFraction!.numerator).toBe(3);
    expect(dist.partialTargetFraction!.denominator).toBe(4);
    expect(dist.partialTargetSourceCount).not.toBeNull();
    expect(dist.partialTargetSourceCount!.toNumber()).toBe(12);
    expect(dist.shortLabel).toBe('16 /furnace');
  });

  it('integer target: 20 extractors / 4 furnaces → 5/furnace, no partial', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(20),
      new Rational(4),
      'Furnace'
    )!;
    expect(dist).not.toBeNull();
    expect(dist.buildingsPerTarget.toNumber()).toBe(5);
    expect(dist.fullTargetBuildings).toBe(4);
    expect(dist.partialTargetFraction).toBeNull();
    expect(dist.partialTargetSourceCount).toBeNull();
    expect(dist.shortLabel).toBe('5 /furnace');
  });

  it('returns null for single target', () => {
    expect(getTargetBuildingDistribution(
      new Rational(10),
      new Rational(1),
      'Furnace'
    )).toBeNull();
  });

  it('returns null for zero target', () => {
    expect(getTargetBuildingDistribution(
      new Rational(10),
      new Rational(0),
      'Furnace'
    )).toBeNull();
  });

  it('returns null for zero source', () => {
    expect(getTargetBuildingDistribution(
      new Rational(0),
      new Rational(4),
      'Furnace'
    )).toBeNull();
  });
});
