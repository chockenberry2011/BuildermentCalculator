import { describe, it, expect } from 'vitest';
import { computeWiringLayout, getCompressedInfo } from '../wiringLayout';

describe('computeWiringLayout', () => {
  it('9 buildings / 2 belts → 4 full per belt, 1 shared', () => {
    const layout = computeWiringLayout(9, 2, 4, 1);
    expect(layout.belts).toHaveLength(2);
    expect(layout.belts[0].buildings).toHaveLength(4);
    expect(layout.belts[1].buildings).toHaveLength(4);
    expect(layout.belts[0].buildings.every(b => !b.isShared)).toBe(true);
    expect(layout.mergeZone).not.toBeNull();
    expect(layout.mergeZone!.buildings).toHaveLength(1);
    expect(layout.mergeZone!.buildings[0].isShared).toBe(true);
    // Shared building x is past the belt end
    expect(layout.mergeZone!.buildings[0].x).toBeGreaterThan(layout.belts[0].endX);
    // Layout dimensions
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBe(80); // 2 belts × 40px spacing
  });

  it('6 buildings / 2 belts → 3 full per belt, 0 shared, no merge zone', () => {
    const layout = computeWiringLayout(6, 2, 3, 0);
    expect(layout.belts).toHaveLength(2);
    expect(layout.belts[0].buildings).toHaveLength(3);
    expect(layout.belts[1].buildings).toHaveLength(3);
    expect(layout.mergeZone).toBeNull();
  });

  it('17 buildings / 3 belts → 5 full per belt, 2 shared', () => {
    const layout = computeWiringLayout(17, 3, 5, 2);
    expect(layout.belts).toHaveLength(3);
    expect(layout.belts[0].buildings).toHaveLength(5);
    expect(layout.mergeZone).not.toBeNull();
    expect(layout.mergeZone!.buildings).toHaveLength(2);
    expect(layout.mergeZone!.buildings.every(b => b.isShared)).toBe(true);
    expect(layout.height).toBe(120); // 3 belts × 40px spacing
  });

  it('large count compression: 20 buildings / 2 belts → compressed rows', () => {
    const layout = computeWiringLayout(20, 2, 10, 0);
    expect(layout.belts).toHaveLength(2);
    // Compressed: shows 3 buildings (2 + last) instead of 10
    expect(layout.belts[0].buildings).toHaveLength(3);
    expect(layout.belts[0].buildings.every(b => !b.isShared)).toBe(true);
    expect(layout.mergeZone).toBeNull();
  });

  it('belt y positions are evenly spaced', () => {
    const layout = computeWiringLayout(9, 3, 3, 0);
    expect(layout.belts[0].y).toBe(20);  // 40/2
    expect(layout.belts[1].y).toBe(60);  // 40/2 + 40
    expect(layout.belts[2].y).toBe(100); // 40/2 + 80
  });
});

describe('getCompressedInfo', () => {
  it('returns null for small counts', () => {
    expect(getCompressedInfo(3)).toBeNull();
    expect(getCompressedInfo(6)).toBeNull();
  });

  it('returns compressed info for large counts', () => {
    const info = getCompressedInfo(10)!;
    expect(info).not.toBeNull();
    expect(info.totalCount).toBe(10);
    expect(info.shown).toHaveLength(3);
    expect(info.shown[2].index).toBe(9); // last building index
  });
});
