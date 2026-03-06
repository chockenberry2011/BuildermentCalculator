import { describe, it, expect } from 'vitest';
import { Rational } from '../math/rational';
import { getBeltDistribution, getTargetBuildingDistribution, getPhysicalBeltCount, computeFeedingPattern } from '../beltDistribution';

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

  it('6.75 extractors / 4.5 furnaces → "1.5 /furnace" with partial breakdown', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(27, 4), // 6.75
      new Rational(9, 2),  // 4.5
      'Furnace'
    )!;
    expect(dist).not.toBeNull();
    expect(Number(dist.buildingsPerTarget.numerator)).toBe(3);
    expect(Number(dist.buildingsPerTarget.denominator)).toBe(2);
    expect(dist.shortLabel).toBe('1.5 /furnace');
    // 4 full furnaces = 2 groups of 3→2, plus 0.5 partial furnace → 0.75 sources
    expect(dist.fullTargetBuildings).toBe(4);
    expect(dist.partialTargetFraction).not.toBeNull();
    expect(dist.partialTargetSourceCount!.toNumber()).toBe(0.75);
    expect(dist.tooltip).toContain('4 full × 1.5');
    expect(dist.tooltip).toContain('1 partial (1/2) × 0.75');
  });

  it('3 extractors / 2 furnaces → "1.5 /furnace" (fractional ratio, integer target)', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(3),
      new Rational(2),
      'Furnace'
    )!;
    expect(dist).not.toBeNull();
    expect(Number(dist.buildingsPerTarget.numerator)).toBe(3);
    expect(Number(dist.buildingsPerTarget.denominator)).toBe(2);
    expect(dist.shortLabel).toBe('1.5 /furnace');
    // Integer target → no partial
    expect(dist.partialTargetFraction).toBeNull();
  });

  it('15 extractors / 3.75 furnaces → "4 /furnace" (integer ratio despite fractional target)', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(15),
      new Rational(15, 4), // 3.75
      'Furnace'
    )!;
    expect(dist).not.toBeNull();
    expect(dist.buildingsPerTarget.toNumber()).toBe(4);
    expect(dist.shortLabel).toBe('4 /furnace');
  });
});

describe('computeFeedingPattern', () => {
  it('3:2 ratio → 1 dedicated, 1 shared, 1 group for 2 targets', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(3),
      new Rational(2),
      'Furnace'
    )!;
    const pattern = computeFeedingPattern(dist);
    expect(pattern.sourcePerGroup).toBe(3);
    expect(pattern.targetPerGroup).toBe(2);
    expect(pattern.dedicatedPerTarget).toBe(1);
    expect(pattern.sharedSources).toBe(1);
    expect(pattern.splitFraction).toBe('1/2');
    expect(pattern.groupCount).toBe(1);
    expect(pattern.remainingTargets).toBe(0);
    expect(pattern.hasPartial).toBe(false);
  });

  it('3:2 ratio with 4 full targets → 2 groups', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(27, 4), // 6.75
      new Rational(9, 2),  // 4.5
      'Furnace'
    )!;
    const pattern = computeFeedingPattern(dist);
    expect(pattern.sourcePerGroup).toBe(3);
    expect(pattern.targetPerGroup).toBe(2);
    expect(pattern.dedicatedPerTarget).toBe(1);
    expect(pattern.sharedSources).toBe(1);
    expect(pattern.groupCount).toBe(2);
    expect(pattern.remainingTargets).toBe(0);
    expect(pattern.hasPartial).toBe(true);
    expect(pattern.partialSourceCount!.toNumber()).toBe(0.75);
  });

  it('16:1 ratio → 16 dedicated, 0 shared', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(60),
      new Rational(15, 4), // 3.75
      'Furnace'
    )!;
    const pattern = computeFeedingPattern(dist);
    expect(pattern.sourcePerGroup).toBe(16);
    expect(pattern.targetPerGroup).toBe(1);
    expect(pattern.dedicatedPerTarget).toBe(16);
    expect(pattern.sharedSources).toBe(0);
    expect(pattern.groupCount).toBe(3);
    expect(pattern.remainingTargets).toBe(0);
    expect(pattern.hasPartial).toBe(true);
    expect(pattern.partialSourceCount!.toNumber()).toBe(12);
  });

  it('1:3 ratio → 0 dedicated, 1 shared split 3 ways', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(1),
      new Rational(3),
      'Furnace'
    )!;
    const pattern = computeFeedingPattern(dist);
    expect(pattern.sourcePerGroup).toBe(1);
    expect(pattern.targetPerGroup).toBe(3);
    expect(pattern.dedicatedPerTarget).toBe(0);
    expect(pattern.sharedSources).toBe(1);
    expect(pattern.splitFraction).toBe('1/3');
    expect(pattern.groupCount).toBe(1);
    expect(pattern.remainingTargets).toBe(0);
    expect(pattern.hasPartial).toBe(false);
  });

  it('5:3 ratio → 1 dedicated, 2 shared', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(5),
      new Rational(3),
      'Furnace'
    )!;
    const pattern = computeFeedingPattern(dist);
    expect(pattern.sourcePerGroup).toBe(5);
    expect(pattern.targetPerGroup).toBe(3);
    expect(pattern.dedicatedPerTarget).toBe(1);
    expect(pattern.sharedSources).toBe(2);
    expect(pattern.splitFraction).toBe('1/3');
    expect(pattern.groupCount).toBe(1);
    expect(pattern.remainingTargets).toBe(0);
  });
});

describe('getPhysicalBeltCount', () => {
  it('returns null when dist is null', () => {
    expect(getPhysicalBeltCount(null, 100, 480)).toBeNull();
  });

  it('6.75→4.5 (ratio 3:2): 3 wiring groups but low throughput → displayBelts stays 1', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(27, 4), // 6.75
      new Rational(9, 2),  // 4.5
      'Furnace'
    )!;
    // Low rate so each group fits in 1 belt
    const info = getPhysicalBeltCount(dist, 90, 480)!;
    expect(info).not.toBeNull();
    expect(info.wiringGroups).toBe(3);   // 2 complete groups of 3:2 + 1 partial
    expect(info.physicalBelts).toBe(3);
    expect(info.throughputBelts).toBe(1); // 90/480 < 1 → ceil = 1
    expect(info.displayBelts).toBe(1);   // throughput fits in 1 belt, no inflation
  });

  it('16/furnace with 3.75 furnaces: 4 wiring groups but low throughput → displayBelts stays 1', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(60),
      new Rational(15, 4), // 3.75
      'Furnace'
    )!;
    const info = getPhysicalBeltCount(dist, 120, 480)!;
    expect(info).not.toBeNull();
    expect(info.wiringGroups).toBe(4);   // 3 full + 1 partial
    expect(info.physicalBelts).toBe(4);
    expect(info.throughputBelts).toBe(1);
    expect(info.displayBelts).toBe(1);   // throughput fits in 1 belt, no inflation
  });

  it('high throughput: physical belts inflate when throughput already multi-belt', () => {
    const dist = getTargetBuildingDistribution(
      new Rational(60),
      new Rational(15, 4), // 3.75
      'Furnace'
    )!;
    // Rate high enough that each full target needs multiple belts
    // rate=2000, beltSpeed=480, ratePerTarget = 2000/3.75 ≈ 533
    const info = getPhysicalBeltCount(dist, 2000, 480)!;
    expect(info).not.toBeNull();
    // Each full target: ceil(533/480) = 2 belts, 3 full = 6
    // Partial (0.75): ceil(0.75*533/480) = ceil(400/480) = 1
    expect(info.physicalBelts).toBe(7);
    expect(info.throughputBelts).toBe(5); // ceil(2000/480) = 5
    expect(info.displayBelts).toBe(7);   // throughput > 1, so max(7, 5) = 7
  });

  it('throughput > physical: displayBelts uses throughput', () => {
    // 3 extractors → 2 furnaces, integer target, no partial
    const dist = getTargetBuildingDistribution(
      new Rational(3),
      new Rational(2),
      'Furnace'
    )!;
    // Rate high enough that throughput belts exceed wiring groups
    // rate=1000, beltSpeed=480 → throughputBelts=3
    // Fractional ratio 3:2, den=2, completeGroups=1, remainingFull=0, no partial → wiringGroups=1
    const info = getPhysicalBeltCount(dist, 1000, 480)!;
    expect(info).not.toBeNull();
    expect(info.wiringGroups).toBe(1);
    expect(info.throughputBelts).toBe(3); // ceil(1000/480)
    expect(info.displayBelts).toBe(3);    // max(physical, throughput) since throughput > 1
  });
});
