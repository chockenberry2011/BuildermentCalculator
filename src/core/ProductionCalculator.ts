import { Recipe, getDefaultRecipe, getRecipesForItem } from '../data/recipes';
import { BuildingType, getBuildingMultiplier, EXTRACTOR_RATES, BUILDINGS } from '../data/buildings';
import { ITEMS } from '../data/items';
import { Rational } from './math/rational';

export interface BuildingRequirement {
  buildingType: BuildingType;
  count: Rational;
  level: number;
}

export interface ProductionNode {
  itemId: string;
  itemName: string;
  ratePerMinute: Rational;
  recipe: Recipe | null;
  building: BuildingRequirement | null;
  children: ProductionNode[];
  isRaw: boolean;
}

export interface ProductionResult {
  root: ProductionNode;
  allNodes: Map<string, ProductionNode[]>;
  buildingSummary: Map<BuildingType, Rational>;
  rawResources: Map<string, Rational>;
  totalPower: number;
}

export type RecipeSelections = Map<string, string>; // itemId -> recipeId

export type BuildingLevels = Map<BuildingType, number>;

const DEFAULT_BUILDING_LEVELS: BuildingLevels = new Map([
  ['extractor', 1],
  ['workshop', 1],
  ['furnace', 1],
  ['machine_shop', 1],
  ['industrial_factory', 1],
  ['manufacturer', 1],
  ['forge', 1],
  ['earth_teleporter', 1],
]);

export function getDefaultBuildingLevels(): BuildingLevels {
  return new Map(DEFAULT_BUILDING_LEVELS);
}

function isRawResource(itemId: string): boolean {
  const item = ITEMS[itemId];
  return item?.category === 'raw';
}

function getSelectedRecipe(itemId: string, selections: RecipeSelections): Recipe | null {
  const selectedId = selections.get(itemId);
  if (selectedId) {
    const recipes = getRecipesForItem(itemId);
    const recipe = recipes.find(r => r.id === selectedId);
    if (recipe) return recipe;
  }
  return getDefaultRecipe(itemId) ?? null;
}

function calculateBuildingCount(
  ratePerMinute: Rational,
  recipe: Recipe,
  buildingLevel: number
): Rational {
  // Output per minute at level 1 = (outputQuantity / craftTime) * 60
  // At higher levels, multiply by speed multiplier
  const multiplier = getBuildingMultiplier(recipe.building, buildingLevel);
  const baseOutputPerMinute = (recipe.outputQuantity / recipe.craftTime) * 60;
  const outputPerBuildingPerMinute = baseOutputPerMinute * multiplier;

  // Buildings needed = rate / output per building
  return ratePerMinute.divide(Rational.fromNumber(outputPerBuildingPerMinute));
}

function calculateExtractorCount(
  ratePerMinute: Rational,
  extractorLevel: number
): Rational {
  const outputPerExtractor = EXTRACTOR_RATES[extractorLevel - 1];
  return ratePerMinute.divide(Rational.fromNumber(outputPerExtractor));
}

export function calculateProduction(
  targetItemId: string,
  targetRatePerMinute: number,
  recipeSelections: RecipeSelections,
  buildingLevels: BuildingLevels
): ProductionResult {
  const allNodes = new Map<string, ProductionNode[]>();
  const buildingSummary = new Map<BuildingType, Rational>();
  const rawResources = new Map<string, Rational>();

  function addToSummary(buildingType: BuildingType, count: Rational) {
    const existing = buildingSummary.get(buildingType) ?? Rational.zero();
    buildingSummary.set(buildingType, existing.add(count));
  }

  function addRawResource(itemId: string, rate: Rational) {
    const existing = rawResources.get(itemId) ?? Rational.zero();
    rawResources.set(itemId, existing.add(rate));
  }

  function buildNode(itemId: string, ratePerMinute: Rational): ProductionNode {
    const item = ITEMS[itemId];
    const itemName = item?.name ?? itemId;

    // Check if raw resource
    if (isRawResource(itemId)) {
      const extractorLevel = buildingLevels.get('extractor') ?? 1;
      const extractorCount = calculateExtractorCount(ratePerMinute, extractorLevel);

      addToSummary('extractor', extractorCount);
      addRawResource(itemId, ratePerMinute);

      const node: ProductionNode = {
        itemId,
        itemName,
        ratePerMinute,
        recipe: null,
        building: {
          buildingType: 'extractor',
          count: extractorCount,
          level: extractorLevel,
        },
        children: [],
        isRaw: true,
      };

      // Track node
      const existing = allNodes.get(itemId) ?? [];
      existing.push(node);
      allNodes.set(itemId, existing);

      return node;
    }

    // Get recipe
    const recipe = getSelectedRecipe(itemId, recipeSelections);
    if (!recipe) {
      // No recipe found - treat as if raw (shouldn't happen for valid items)
      const node: ProductionNode = {
        itemId,
        itemName,
        ratePerMinute,
        recipe: null,
        building: null,
        children: [],
        isRaw: true,
      };
      return node;
    }

    // Calculate building requirements
    const buildingLevel = buildingLevels.get(recipe.building) ?? 1;
    const buildingCount = calculateBuildingCount(ratePerMinute, recipe, buildingLevel);

    addToSummary(recipe.building, buildingCount);

    // Calculate ingredient requirements and build child nodes
    const children: ProductionNode[] = [];
    for (const ingredient of recipe.ingredients) {
      // Ingredient rate = (ingredient quantity / output quantity) * target rate
      const ingredientRate = ratePerMinute
        .multiply(new Rational(ingredient.quantity, 1))
        .divide(new Rational(recipe.outputQuantity, 1));

      const childNode = buildNode(ingredient.itemId, ingredientRate);
      children.push(childNode);
    }

    const node: ProductionNode = {
      itemId,
      itemName,
      ratePerMinute,
      recipe,
      building: {
        buildingType: recipe.building,
        count: buildingCount,
        level: buildingLevel,
      },
      children,
      isRaw: false,
    };

    // Track node
    const existing = allNodes.get(itemId) ?? [];
    existing.push(node);
    allNodes.set(itemId, existing);

    return node;
  }

  const root = buildNode(targetItemId, Rational.fromNumber(targetRatePerMinute));

  // Compute total power consumption
  let totalPower = 0;
  for (const [bt, count] of buildingSummary) {
    const info = BUILDINGS[bt];
    if (info) {
      const level = buildingLevels.get(bt) ?? 1;
      const idx = Math.min(level, info.maxLevel) - 1;
      const powerPerBuilding = info.powerConsumption[idx];
      totalPower += Math.ceil(count.toNumber()) * powerPerBuilding;
    }
  }

  return {
    root,
    allNodes,
    buildingSummary,
    rawResources,
    totalPower,
  };
}

/**
 * Calculate production for multiple targets and merge results.
 * Creates a synthetic __multi_root__ node whose children are the individual roots.
 */
export function calculateMultiProduction(
  targets: { itemId: string; rate: number }[],
  recipeSelections: RecipeSelections,
  buildingLevels: BuildingLevels
): ProductionResult {
  const results = targets.map((t) =>
    calculateProduction(t.itemId, t.rate, recipeSelections, buildingLevels)
  );

  // Merge allNodes, buildingSummary, rawResources, totalPower
  const mergedAllNodes = new Map<string, ProductionNode[]>();
  const mergedBuildingSummary = new Map<BuildingType, Rational>();
  const mergedRawResources = new Map<string, Rational>();
  let mergedTotalPower = 0;

  for (const result of results) {
    for (const [itemId, nodes] of result.allNodes) {
      const existing = mergedAllNodes.get(itemId) ?? [];
      existing.push(...nodes);
      mergedAllNodes.set(itemId, existing);
    }
    for (const [bt, count] of result.buildingSummary) {
      const existing = mergedBuildingSummary.get(bt) ?? Rational.zero();
      mergedBuildingSummary.set(bt, existing.add(count));
    }
    for (const [resId, rate] of result.rawResources) {
      const existing = mergedRawResources.get(resId) ?? Rational.zero();
      mergedRawResources.set(resId, existing.add(rate));
    }
    mergedTotalPower += result.totalPower;
  }

  // Create synthetic root
  const totalRate = results.reduce(
    (sum, r) => sum.add(r.root.ratePerMinute),
    Rational.zero()
  );

  const syntheticRoot: ProductionNode = {
    itemId: '__multi_root__',
    itemName: 'Multi-Target',
    ratePerMinute: totalRate,
    recipe: null,
    building: null,
    children: results.map((r) => r.root),
    isRaw: false,
  };

  return {
    root: syntheticRoot,
    allNodes: mergedAllNodes,
    buildingSummary: mergedBuildingSummary,
    rawResources: mergedRawResources,
    totalPower: mergedTotalPower,
  };
}

// Aggregate building counts by type across entire production chain
export function aggregateBuildingsByType(result: ProductionResult): Array<{
  buildingType: BuildingType;
  totalCount: Rational;
  level: number;
}> {
  const summary: Array<{
    buildingType: BuildingType;
    totalCount: Rational;
    level: number;
  }> = [];

  for (const [buildingType, count] of result.buildingSummary) {
    // Level would need to come from somewhere - for now use first found
    let level = 1;
    for (const nodes of result.allNodes.values()) {
      for (const node of nodes) {
        if (node.building?.buildingType === buildingType) {
          level = node.building.level;
          break;
        }
      }
    }
    summary.push({ buildingType, totalCount: count, level });
  }

  return summary.sort((a, b) => a.buildingType.localeCompare(b.buildingType));
}
