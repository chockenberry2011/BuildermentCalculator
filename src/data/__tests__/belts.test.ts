import { describe, it, expect } from 'vitest';
import {
  classifyBeltStatus,
  getBeltsNeeded,
  getBeltUtilization,
  isCleanBeltMultiple,
  requiresFractionalBelts,
  getPerfectBeltThroughput,
} from '../belts';

const BELT_SPEED = 480;

describe('classifyBeltStatus', () => {
  it('returns ok for low throughput', () => {
    expect(classifyBeltStatus(100, BELT_SPEED)).toBe('ok');
  });

  it('returns near-capacity for >80%', () => {
    expect(classifyBeltStatus(400, BELT_SPEED)).toBe('near-capacity');
  });

  it('returns multi-belt for exceeding belt speed', () => {
    expect(classifyBeltStatus(500, BELT_SPEED)).toBe('multi-belt');
  });

  it('returns ok for zero throughput', () => {
    expect(classifyBeltStatus(0, BELT_SPEED)).toBe('ok');
  });

  it('returns ok for exactly 80%', () => {
    // 384 = 80% of 480
    expect(classifyBeltStatus(384, BELT_SPEED)).toBe('ok');
  });

  it('returns near-capacity just above 80%', () => {
    expect(classifyBeltStatus(385, BELT_SPEED)).toBe('near-capacity');
  });
});

describe('getBeltsNeeded', () => {
  it('returns 1 for under belt speed', () => {
    expect(getBeltsNeeded(200, BELT_SPEED)).toBe(1);
  });

  it('returns 2 for just over belt speed', () => {
    expect(getBeltsNeeded(481, BELT_SPEED)).toBe(2);
  });

  it('returns exact for clean multiple', () => {
    expect(getBeltsNeeded(960, BELT_SPEED)).toBe(2);
  });

  it('returns 0 for zero', () => {
    expect(getBeltsNeeded(0, BELT_SPEED)).toBe(0);
  });
});

describe('getBeltUtilization', () => {
  it('returns 1.0 for exact belt speed', () => {
    expect(getBeltUtilization(480, BELT_SPEED)).toBe(1);
  });

  it('returns 0.5 for half belt', () => {
    expect(getBeltUtilization(240, BELT_SPEED)).toBe(0.5);
  });

  it('returns 1.0 for zero throughput', () => {
    expect(getBeltUtilization(0, BELT_SPEED)).toBe(1);
  });
});

describe('isCleanBeltMultiple', () => {
  it('returns true for exact multiple', () => {
    expect(isCleanBeltMultiple(960, BELT_SPEED)).toBe(true);
  });

  it('returns false for non-multiple', () => {
    expect(isCleanBeltMultiple(500, BELT_SPEED)).toBe(false);
  });

  it('returns true for zero', () => {
    expect(isCleanBeltMultiple(0, BELT_SPEED)).toBe(true);
  });
});

describe('requiresFractionalBelts', () => {
  it('returns false for clean multiples', () => {
    expect(requiresFractionalBelts(480, BELT_SPEED)).toBe(false);
    expect(requiresFractionalBelts(960, BELT_SPEED)).toBe(false);
  });

  it('returns true for fractional', () => {
    expect(requiresFractionalBelts(500, BELT_SPEED)).toBe(true);
  });
});

describe('getPerfectBeltThroughput', () => {
  it('returns belt speed * count', () => {
    expect(getPerfectBeltThroughput(3, BELT_SPEED)).toBe(1440);
  });
});
