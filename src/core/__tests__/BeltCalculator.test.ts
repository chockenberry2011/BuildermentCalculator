import { describe, it, expect } from 'vitest';
import { calculateBeltRequirements } from '../BeltCalculator';
import { calculateProduction, getDefaultBuildingLevels } from '../ProductionCalculator';

const defaultLevels = getDefaultBuildingLevels();
const noRecipes = new Map<string, string>();
const BELT_SPEED = 480;

describe('calculateBeltRequirements', () => {
  it('returns connections for production tree', () => {
    const result = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const beltResult = calculateBeltRequirements(result, BELT_SPEED);
    expect(beltResult.connections.length).toBeGreaterThan(0);
    expect(beltResult.totalConnections).toBe(beltResult.connections.length);
  });

  it('classifies all connections', () => {
    const result = calculateProduction('turbocharger', 10, noRecipes, defaultLevels);
    const beltResult = calculateBeltRequirements(result, BELT_SPEED);
    for (const conn of beltResult.connections) {
      expect(['multi-belt', 'near-capacity', 'ok']).toContain(conn.status);
    }
  });

  it('detects multi-belt for high throughput', () => {
    // At a high enough rate, some connections should exceed belt speed
    const result = calculateProduction('turbocharger', 100, noRecipes, defaultLevels);
    const beltResult = calculateBeltRequirements(result, BELT_SPEED);
    expect(beltResult.hasMultiBelt).toBe(true);
    expect(beltResult.multiBeltConnections.length).toBeGreaterThan(0);
  });

  it('handles raw resource (no connections)', () => {
    const result = calculateProduction('iron_ore', 1, noRecipes, defaultLevels);
    const beltResult = calculateBeltRequirements(result, BELT_SPEED);
    expect(beltResult.connections).toHaveLength(0);
    expect(beltResult.totalConnections).toBe(0);
  });

  it('belt utilization is between 0 and 1', () => {
    const result = calculateProduction('turbocharger', 5, noRecipes, defaultLevels);
    const beltResult = calculateBeltRequirements(result, BELT_SPEED);
    for (const conn of beltResult.connections) {
      expect(conn.utilization).toBeGreaterThan(0);
      expect(conn.utilization).toBeLessThanOrEqual(1);
    }
  });

  it('multiBeltConnections sorted by beltsNeeded descending', () => {
    const result = calculateProduction('turbocharger', 100, noRecipes, defaultLevels);
    const beltResult = calculateBeltRequirements(result, BELT_SPEED);
    for (let i = 1; i < beltResult.multiBeltConnections.length; i++) {
      expect(beltResult.multiBeltConnections[i - 1].beltsNeeded)
        .toBeGreaterThanOrEqual(beltResult.multiBeltConnections[i].beltsNeeded);
    }
  });
});
