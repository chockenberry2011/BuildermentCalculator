import { describe, it, expect } from 'vitest';
import {
  calculateProduction,
  calculateMultiProduction,
  getDefaultBuildingLevels,
} from '../ProductionCalculator';

const defaultLevels = getDefaultBuildingLevels();
const noRecipes = new Map<string, string>();

describe('calculateProduction', () => {
  it('calculates a raw resource (iron_ore)', () => {
    const result = calculateProduction('iron_ore', 1, noRecipes, defaultLevels);
    expect(result.root.itemId).toBe('iron_ore');
    expect(result.root.isRaw).toBe(true);
    expect(result.root.ratePerMinute.toNumber()).toBeCloseTo(1);
    expect(result.root.children).toHaveLength(0);
    expect(result.rawResources.size).toBe(1);
  });

  it('calculates a simple intermediate (iron_ingot)', () => {
    const result = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    expect(result.root.itemId).toBe('iron_ingot');
    expect(result.root.isRaw).toBe(false);
    expect(result.root.children.length).toBeGreaterThan(0);
    // Iron ingot needs iron ore
    expect(result.rawResources.has('iron_ore')).toBe(true);
  });

  it('calculates a component (copper_wire)', () => {
    const result = calculateProduction('copper_wire', 1, noRecipes, defaultLevels);
    expect(result.root.itemId).toBe('copper_wire');
    expect(result.rawResources.has('copper_ore')).toBe(true);
    expect(result.buildingSummary.size).toBeGreaterThan(0);
  });

  it('calculates an end product (turbocharger)', () => {
    const result = calculateProduction('turbocharger', 1, noRecipes, defaultLevels);
    expect(result.root.itemId).toBe('turbocharger');
    expect(result.rawResources.size).toBeGreaterThan(1);
    expect(result.buildingSummary.size).toBeGreaterThan(1);
  });

  it('scales correctly with rate', () => {
    const result1 = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const result2 = calculateProduction('iron_ingot', 2, noRecipes, defaultLevels);

    const ironOre1 = result1.rawResources.get('iron_ore')!.toNumber();
    const ironOre2 = result2.rawResources.get('iron_ore')!.toNumber();
    expect(ironOre2).toBeCloseTo(ironOre1 * 2);
  });

  it('respects building levels', () => {
    const levels1 = getDefaultBuildingLevels();
    levels1.set('extractor', 1);
    const levels2 = getDefaultBuildingLevels();
    levels2.set('extractor', 5);

    const result1 = calculateProduction('iron_ore', 30, noRecipes, levels1);
    const result2 = calculateProduction('iron_ore', 30, noRecipes, levels2);

    // At level 5 (30/min), 30 needs 1 extractor
    // At level 1 (7.5/min), 30 needs 4 extractors
    const count1 = result1.buildingSummary.get('extractor')!.toNumber();
    const count2 = result2.buildingSummary.get('extractor')!.toNumber();
    expect(count1).toBeGreaterThan(count2);
  });

  it('handles diamond dependencies (shared resources)', () => {
    // Steel needs iron_ingot + coal; iron_ingot needs iron_ore
    // If we produce steel, iron_ore appears as raw resource
    const result = calculateProduction('steel', 1, noRecipes, defaultLevels);
    expect(result.rawResources.has('iron_ore')).toBe(true);
    expect(result.rawResources.has('coal')).toBe(true);
  });

  it('includes totalPower in result', () => {
    const result = calculateProduction('turbocharger', 1, noRecipes, defaultLevels);
    expect(typeof result.totalPower).toBe('number');
    expect(result.totalPower).toBeGreaterThan(0);
  });

  it('handles zero rate gracefully (returns zero counts)', () => {
    const result = calculateProduction('iron_ingot', 0, noRecipes, defaultLevels);
    expect(result.root.ratePerMinute.toNumber()).toBe(0);
  });
});

describe('calculateMultiProduction', () => {
  it('creates synthetic multi_root', () => {
    const result = calculateMultiProduction(
      [
        { itemId: 'iron_ingot', rate: 1 },
        { itemId: 'copper_wire', rate: 1 },
      ],
      noRecipes,
      defaultLevels
    );
    expect(result.root.itemId).toBe('__multi_root__');
    expect(result.root.children).toHaveLength(2);
  });

  it('merges raw resources across targets', () => {
    const single1 = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const single2 = calculateProduction('steel', 1, noRecipes, defaultLevels);

    const multi = calculateMultiProduction(
      [
        { itemId: 'iron_ingot', rate: 1 },
        { itemId: 'steel', rate: 1 },
      ],
      noRecipes,
      defaultLevels
    );

    // Iron ore should be summed from both
    const singleIronOre =
      (single1.rawResources.get('iron_ore')?.toNumber() ?? 0) +
      (single2.rawResources.get('iron_ore')?.toNumber() ?? 0);
    const multiIronOre = multi.rawResources.get('iron_ore')?.toNumber() ?? 0;
    expect(multiIronOre).toBeCloseTo(singleIronOre);
  });

  it('merges building summaries', () => {
    const multi = calculateMultiProduction(
      [
        { itemId: 'iron_ingot', rate: 1 },
        { itemId: 'copper_wire', rate: 1 },
      ],
      noRecipes,
      defaultLevels
    );
    // Both need extractors
    expect(multi.buildingSummary.has('extractor')).toBe(true);
  });

  it('sums totalPower across targets', () => {
    const single1 = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const single2 = calculateProduction('copper_wire', 1, noRecipes, defaultLevels);

    const multi = calculateMultiProduction(
      [
        { itemId: 'iron_ingot', rate: 1 },
        { itemId: 'copper_wire', rate: 1 },
      ],
      noRecipes,
      defaultLevels
    );

    expect(multi.totalPower).toBe(single1.totalPower + single2.totalPower);
  });
});
