import { ITEMS } from '../data/items';
import { ViewMode, BlueprintMergeMode } from './useStore';

export interface URLState {
  item?: string;
  rate?: number;
  belt?: number;
  view?: ViewMode;
  merge?: BlueprintMergeMode;
  recipes?: Map<string, string>;
  levels?: Map<string, number>;
  targets?: { itemId: string; rate: number }[];
  worldGen2?: boolean;
}

export function parseURLParams(): URLState {
  const params = new URLSearchParams(window.location.search);
  const result: URLState = {};

  // Multi-target mode
  const targetsParam = params.get('targets');
  if (targetsParam) {
    const targets: { itemId: string; rate: number }[] = [];
    for (const pair of targetsParam.split(',')) {
      const [itemId, rateStr] = pair.split(':');
      const rate = parseFloat(rateStr);
      if (itemId && ITEMS[itemId] && !isNaN(rate) && rate > 0) {
        targets.push({ itemId, rate });
      }
    }
    if (targets.length > 0) {
      result.targets = targets;
      return result; // multi-target overrides single item/rate
    }
  }

  // Single item
  const item = params.get('item');
  if (item && ITEMS[item]) {
    result.item = item;
  }

  // Rate
  const rate = params.get('rate');
  if (rate) {
    const parsed = parseFloat(rate);
    if (!isNaN(parsed) && parsed > 0) {
      result.rate = parsed;
    }
  }

  // Belt speed
  const belt = params.get('belt');
  if (belt) {
    const parsed = parseFloat(belt);
    if (!isNaN(parsed) && parsed > 0) {
      result.belt = parsed;
    }
  }

  // View mode
  const view = params.get('view');
  if (view === 'tree' || view === 'blueprint') {
    result.view = view;
  }

  // Merge mode
  const merge = params.get('merge');
  if (merge === 'merged' || merge === 'hybrid' || merge === 'dedicated') {
    result.merge = merge;
  }

  // Recipe selections (key:value pairs)
  const recipes = params.get('recipes');
  if (recipes) {
    const map = new Map<string, string>();
    for (const pair of recipes.split(',')) {
      const [itemId, recipeId] = pair.split(':');
      if (itemId && recipeId) {
        map.set(itemId, recipeId);
      }
    }
    if (map.size > 0) result.recipes = map;
  }

  // Building levels (key:value pairs)
  const levels = params.get('levels');
  if (levels) {
    const map = new Map<string, number>();
    for (const pair of levels.split(',')) {
      const [building, levelStr] = pair.split(':');
      const level = parseInt(levelStr, 10);
      if (building && !isNaN(level) && level >= 1 && level <= 5) {
        map.set(building, level);
      }
    }
    if (map.size > 0) result.levels = map;
  }

  // World Gen 2.0
  const worldgen = params.get('worldgen');
  if (worldgen === '1') {
    result.worldGen2 = true;
  }

  return result;
}

interface StoreStateForURL {
  targetItemId: string;
  targetRate: number;
  beltSpeed: number;
  viewMode: ViewMode;
  blueprintMergeMode: BlueprintMergeMode;
  recipeSelections: Map<string, string>;
  buildingLevels: Map<string, number>;
  targets?: { id: string; itemId: string; rate: number }[];
  worldGen2?: boolean;
}

export function updateURL(state: StoreStateForURL) {
  const params = new URLSearchParams();

  // Multi-target mode
  if (state.targets && state.targets.length > 1) {
    const encoded = state.targets
      .map((t) => `${t.itemId}:${t.rate}`)
      .join(',');
    params.set('targets', encoded);
  } else {
    // Single target
    params.set('item', state.targetItemId);
    params.set('rate', String(state.targetRate));
  }

  params.set('belt', String(state.beltSpeed));
  params.set('view', state.viewMode);

  // Only include non-default merge mode (default is 'hybrid')
  if (state.blueprintMergeMode !== 'hybrid') {
    params.set('merge', state.blueprintMergeMode);
  }

  // Only include non-default recipe selections
  if (state.recipeSelections.size > 0) {
    const pairs: string[] = [];
    for (const [itemId, recipeId] of state.recipeSelections) {
      pairs.push(`${itemId}:${recipeId}`);
    }
    if (pairs.length > 0) params.set('recipes', pairs.join(','));
  }

  // Only include non-default building levels (default is 1)
  const nonDefaultLevels: string[] = [];
  for (const [building, level] of state.buildingLevels) {
    if (level !== 1) {
      nonDefaultLevels.push(`${building}:${level}`);
    }
  }
  if (nonDefaultLevels.length > 0) params.set('levels', nonDefaultLevels.join(','));

  // Only include worldgen when enabled (non-default)
  if (state.worldGen2) {
    params.set('worldgen', '1');
  }

  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newURL);
}
