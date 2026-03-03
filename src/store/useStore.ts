import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BuildingType, getExtractorRates } from '../data/buildings';
import { DEFAULT_BELT_SPEED } from '../data/belts';
import {
  calculateProduction,
  calculateMultiProduction,
  ProductionResult,
  ProductionNode,
  RecipeSelections,
  BuildingLevels,
  getDefaultBuildingLevels,
} from '../core/ProductionCalculator';
import {
  calculateBeltRequirements,
  BeltCalculationResult,
} from '../core/BeltCalculator';
import { generateProposals } from '../core/FractionalSolver';
import { calculateFromResources } from '../core/ReverseCalculator';
import { findBestAllIntegerScale, findBestPracticalRates, BestPracticalRates } from '../core/RatioOptimizer';
import { parseURLParams, updateURL } from './urlSync';

export type ViewMode = 'tree' | 'blueprint';
export type ThemeMode = 'light' | 'dark';
export type OptimizationDetailLevel = 'minimal' | 'standard' | 'full';
export type BlueprintOrientation = 'horizontal' | 'vertical';
export type BlueprintMergeMode = 'merged' | 'hybrid' | 'dedicated';
export type BlueprintProgressState = 'in_progress' | 'completed';

// Feature 2: Fractional building fix suggestions
export interface ScalingSuggestion {
  targetRate: number;
  targetBuildingCount: number;
  otherBuildingsStillInteger: boolean;
  beltsStillClean: boolean;
}

export interface FractionalProposal {
  buildingType: BuildingType;
  buildingName: string;
  currentCount: number;
  scaleUp: ScalingSuggestion | null;
  scaleDown: ScalingSuggestion | null;
  overproductionPercent: number;
}

// Feature 3: Resource-based mode
export interface ResourceConstraint {
  resourceId: string;
  extractorCount: number;
}

export interface ReverseResult {
  maxOutputRate: number;
  bottleneck: {
    resourceId: string;
    resourceName: string;
    suggestion: string;
  } | null;
  buildingRequirements: Map<BuildingType, number>;
  resourceUtilization: Map<string, { used: number; available: number }>;
  allBuildingsInteger: boolean;
  allBeltsClean: boolean;
}

// Multi-target production
export interface ProductionTarget {
  id: string;
  itemId: string;
  rate: number;
}

// Track which constraint is currently driving the calculation
export type ConstraintSource =
  | { type: 'rate' }
  | { type: 'building'; buildingType: BuildingType }
  | { type: 'itemBuilding'; itemId: string }
  | { type: 'resource'; resourceId: string }
  | { type: 'extractor'; resourceId: string };

interface CalculatorState {
  // Target settings
  targetItemId: string;
  targetRate: number;

  // Multi-target
  targets: ProductionTarget[];

  // Configuration
  recipeSelections: RecipeSelections;
  buildingLevels: BuildingLevels;

  // Belt configuration - single speed value
  beltSpeed: number; // items per minute
  showBeltInfo: boolean;

  // UI state
  viewMode: ViewMode;
  theme: ThemeMode;
  optimizationDetailLevel: OptimizationDetailLevel;
  blueprintOrientation: BlueprintOrientation;
  blueprintMergeMode: BlueprintMergeMode;
  collapsedSections: Record<string, boolean>;

  // Blueprint progress tracking (nodeKey → state; absence = not started)
  blueprintProgress: Map<string, BlueprintProgressState>;

  // Blueprint node position overrides (nodeKey → {x, y})
  blueprintPositions: Map<string, { x: number; y: number }>;

  // Feature 1: Clean rates filter
  cleanRatesOnly: boolean;

  // Feature 4: Auto-integer mode
  autoIntegerMode: boolean;

  // Feature 2: Fractional proposals (computed)
  fractionalProposals: FractionalProposal[];

  // Feature 3: Resource constraints
  resourceConstraints: ResourceConstraint[];
  reverseResult: ReverseResult | null;

  // Always-computed practical rate recommendations
  referenceResult: ProductionResult | null;
  bestPracticalRates: BestPracticalRates | null;

  // World Gen 2.0 extractor rates
  worldGen2: boolean;

  // Constraint tracking - which input is driving the calculation
  constraintSource: ConstraintSource;

  // Computed
  productionResult: ProductionResult | null;
  beltResult: BeltCalculationResult | null;

  // Actions
  setTargetItem: (itemId: string) => void;
  setTargetRate: (rate: number) => void;
  setRecipeSelection: (itemId: string, recipeId: string) => void;
  setBuildingLevel: (building: BuildingType, level: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setOptimizationDetailLevel: (level: OptimizationDetailLevel) => void;
  setBlueprintOrientation: (orientation: BlueprintOrientation) => void;
  setBlueprintMergeMode: (mode: BlueprintMergeMode) => void;
  toggleTheme: () => void;
  setBeltSpeed: (speed: number) => void;
  toggleBeltInfo: () => void;
  setCleanRatesOnly: (value: boolean) => void;
  setAutoIntegerMode: (value: boolean) => void;
  applyBestRate: () => void;
  setWorldGen2: (value: boolean) => void;
  setResourceConstraints: (constraints: ResourceConstraint[]) => void;
  setRateFromBuildingCount: (buildingType: BuildingType, count: number) => void;
  setRateFromItemBuildingCount: (itemId: string, count: number) => void;
  setRateFromResourceAmount: (resourceId: string, ratePerMinute: number) => void;
  setRateFromExtractorCount: (resourceId: string, extractorCount: number) => void;
  toggleBlueprintProgress: (nodeKey: string) => void;
  setBlueprintProgressState: (nodeKey: string, state: BlueprintProgressState | null) => void;
  clearBlueprintProgress: () => void;
  setBlueprintPosition: (nodeKey: string, position: { x: number; y: number }) => void;
  clearBlueprintPositions: () => void;
  resetCalculator: () => void;
  toggleSection: (sectionId: string) => void;
  addTarget: () => void;
  removeTarget: (id: string) => void;
  updateTarget: (id: string, partial: Partial<Pick<ProductionTarget, 'itemId' | 'rate'>>) => void;
  recalculate: () => void;
}

// Helper to convert Map to/from JSON for persistence
function mapToObject<K extends string, V>(map: Map<K, V>): Record<K, V> {
  const obj = {} as Record<K, V>;
  for (const [k, v] of map) {
    obj[k] = v;
  }
  return obj;
}

function objectToMap<K extends string, V>(obj: Record<K, V> | undefined): Map<K, V> {
  const map = new Map<K, V>();
  if (obj) {
    for (const [k, v] of Object.entries(obj)) {
      map.set(k as K, v as V);
    }
  }
  return map;
}

function findNodeCount(node: ProductionNode, itemId: string): number | null {
  if (node.itemId === itemId && node.building) {
    return node.building.count.toNumber();
  }
  for (const child of node.children) {
    const found = findNodeCount(child, itemId);
    if (found !== null) return found;
  }
  return null;
}

export const useStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
      // Initial state
      targetItemId: 'turbocharger',
      targetRate: 1,
      targets: [{ id: 'default', itemId: 'turbocharger', rate: 1 }],
      recipeSelections: new Map(),
      buildingLevels: getDefaultBuildingLevels(),
      beltSpeed: DEFAULT_BELT_SPEED,
      showBeltInfo: true,
      viewMode: 'tree',
      theme: 'dark',
      optimizationDetailLevel: 'standard',
      blueprintOrientation: 'horizontal' as BlueprintOrientation,
      blueprintMergeMode: 'hybrid' as BlueprintMergeMode,
      collapsedSections: {},
      blueprintProgress: new Map(),
      blueprintPositions: new Map(),
      cleanRatesOnly: false,
      autoIntegerMode: false,
      fractionalProposals: [],
      resourceConstraints: [],
      reverseResult: null,
      referenceResult: null,
      bestPracticalRates: null,
      worldGen2: false,
      constraintSource: { type: 'rate' } as ConstraintSource,
      productionResult: null,
      beltResult: null,

      // Actions
      setTargetItem: (itemId) => {
        const targets = [...get().targets];
        if (targets.length > 0) {
          targets[0] = { ...targets[0], itemId };
        }
        set({ targetItemId: itemId, targets });
        get().recalculate();
        if (get().autoIntegerMode) {
          get().applyBestRate();
        }
      },

      setTargetRate: (rate) => {
        const targets = [...get().targets];
        if (targets.length > 0) {
          targets[0] = { ...targets[0], rate };
        }
        set({ targetRate: rate, targets, constraintSource: { type: 'rate' } });
        get().recalculate();
      },

      setOptimizationDetailLevel: (level) => {
        set({ optimizationDetailLevel: level });
      },

      setRecipeSelection: (itemId, recipeId) => {
        const selections = new Map(get().recipeSelections);
        selections.set(itemId, recipeId);
        set({ recipeSelections: selections });
        get().recalculate();
      },

      setBuildingLevel: (building, level) => {
        const levels = new Map(get().buildingLevels);
        levels.set(building, level);
        set({ buildingLevels: levels });
        get().recalculate();
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setBlueprintOrientation: (orientation) => {
        set({ blueprintOrientation: orientation });
      },

      setBlueprintMergeMode: (mode) => {
        set({ blueprintMergeMode: mode });
      },

      toggleTheme: () => {
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }));
      },

      setBeltSpeed: (speed) => {
        set({ beltSpeed: speed });
        get().recalculate();
      },

      toggleBeltInfo: () => {
        set((state) => ({ showBeltInfo: !state.showBeltInfo }));
      },

      setCleanRatesOnly: (value) => {
        set({ cleanRatesOnly: value });
      },

      setAutoIntegerMode: (value) => {
        set({ autoIntegerMode: value });
        if (value) {
          get().applyBestRate();
        }
      },

      setWorldGen2: (value) => {
        set({ worldGen2: value });
        get().recalculate();
      },

      applyBestRate: () => {
        const { bestPracticalRates, targetItemId, recipeSelections, buildingLevels, beltSpeed, worldGen2 } = get();

        // Prefer bestSimple (fewest extractors with good fractions), fall back to bestAllInteger
        const best = bestPracticalRates?.bestSimple ?? bestPracticalRates?.bestAllInteger;
        if (best) {
          set({ targetRate: best.rate });
          get().recalculate();
          return;
        }

        // Fallback to existing logic
        if (!targetItemId) return;
        const refResult = calculateProduction(targetItemId, 1, recipeSelections, buildingLevels, getExtractorRates(worldGen2));
        const bestCandidate = findBestAllIntegerScale(refResult, 100, beltSpeed);
        if (bestCandidate) {
          set({ targetRate: bestCandidate.scale });
          get().recalculate();
        }
      },

      setResourceConstraints: (constraints) => {
        const { constraintSource } = get();
        // If the constraining extractor/resource was removed, reset to rate
        if (
          (constraintSource.type === 'extractor' || constraintSource.type === 'resource') &&
          !constraints.some(c => c.resourceId === constraintSource.resourceId)
        ) {
          set({ resourceConstraints: constraints, constraintSource: { type: 'rate' } });
        } else {
          set({ resourceConstraints: constraints });
        }
        get().recalculate();
      },

      setRateFromBuildingCount: (buildingType, count) => {
        const { targetItemId, recipeSelections, buildingLevels, worldGen2 } = get();
        if (!targetItemId || count <= 0) return;

        // Calculate production at rate=1 to get the building count per unit rate
        const referenceResult = calculateProduction(
          targetItemId,
          1,
          recipeSelections,
          buildingLevels,
          getExtractorRates(worldGen2)
        );

        // Find the building count at rate=1
        const refCount = referenceResult.buildingSummary.get(buildingType);
        if (!refCount || refCount.toNumber() === 0) return;

        // Calculate the rate that would give us the desired building count
        // rate = desiredCount / countAtRate1
        const impliedRate = count / refCount.toNumber();

        set({
          targetRate: impliedRate,
          constraintSource: { type: 'building', buildingType },
        });
        get().recalculate();
      },

      setRateFromItemBuildingCount: (itemId, count) => {
        const { targetRate, productionResult } = get();
        if (!productionResult || count <= 0) return;

        // Find the current count for this item in the production tree
        const currentCount = findNodeCount(productionResult.root, itemId);
        if (!currentCount || currentCount === 0) return;

        // Scale proportionally: newRate / oldRate = newCount / oldCount
        const impliedRate = targetRate * (count / currentCount);

        set({
          targetRate: impliedRate,
          constraintSource: { type: 'itemBuilding', itemId },
        });
        get().recalculate();
      },

      setRateFromResourceAmount: (resourceId, ratePerMinute) => {
        const { targetItemId, recipeSelections, buildingLevels, worldGen2 } = get();
        if (!targetItemId || ratePerMinute <= 0) return;

        // Calculate production at rate=1 to get the resource rate per unit output
        const referenceResult = calculateProduction(
          targetItemId,
          1,
          recipeSelections,
          buildingLevels,
          getExtractorRates(worldGen2)
        );

        // Find the resource rate at rate=1
        const refRate = referenceResult.rawResources.get(resourceId);
        if (!refRate || refRate.toNumber() === 0) return;

        // Calculate the output rate that would use the specified resource rate
        // outputRate = desiredResourceRate / resourceRateAtRate1
        const impliedRate = ratePerMinute / refRate.toNumber();

        set({
          targetRate: impliedRate,
          constraintSource: { type: 'resource', resourceId },
        });
        get().recalculate();
      },

      setRateFromExtractorCount: (resourceId, extractorCount) => {
        const { targetItemId, recipeSelections, buildingLevels, resourceConstraints, worldGen2 } = get();
        if (!targetItemId || extractorCount <= 0) return;

        const extractorLevel = buildingLevels.get('extractor') ?? 1;
        const extractorRates = getExtractorRates(worldGen2);
        const ratePerExtractor = extractorRates[extractorLevel - 1];
        const resourceRate = extractorCount * ratePerExtractor;

        // Calculate production at rate=1 to get the resource rate per unit output
        const referenceResult = calculateProduction(
          targetItemId,
          1,
          recipeSelections,
          buildingLevels,
          extractorRates
        );

        const refRate = referenceResult.rawResources.get(resourceId);
        if (!refRate || refRate.toNumber() === 0) return;

        const impliedRate = resourceRate / refRate.toNumber();

        // Update the extractor count in resource constraints
        const updatedConstraints = resourceConstraints.map(c =>
          c.resourceId === resourceId
            ? { ...c, extractorCount: Math.max(0, extractorCount) }
            : c
        );

        set({
          targetRate: impliedRate,
          resourceConstraints: updatedConstraints,
          constraintSource: { type: 'extractor', resourceId },
        });
        get().recalculate();
      },

      toggleBlueprintProgress: (nodeKey) => {
        const progress = new Map(get().blueprintProgress);
        const current = progress.get(nodeKey);
        if (!current) {
          progress.set(nodeKey, 'in_progress');
        } else if (current === 'in_progress') {
          progress.set(nodeKey, 'completed');
        } else {
          progress.delete(nodeKey);
        }
        set({ blueprintProgress: progress });
      },

      setBlueprintProgressState: (nodeKey, state) => {
        const progress = new Map(get().blueprintProgress);
        if (state === null) {
          progress.delete(nodeKey);
        } else {
          progress.set(nodeKey, state);
        }
        set({ blueprintProgress: progress });
      },

      clearBlueprintProgress: () => {
        set({ blueprintProgress: new Map() });
      },

      setBlueprintPosition: (nodeKey, position) => {
        const positions = new Map(get().blueprintPositions);
        positions.set(nodeKey, position);
        set({ blueprintPositions: positions });
      },

      clearBlueprintPositions: () => {
        set({ blueprintPositions: new Map() });
      },

      resetCalculator: () => {
        set({
          targetItemId: 'wood_plank',
          targetRate: 1,
          targets: [{ id: 'default', itemId: 'wood_plank', rate: 1 }],
          recipeSelections: new Map(),
          resourceConstraints: [],
          constraintSource: { type: 'rate' },
          reverseResult: null,
          fractionalProposals: [],
          autoIntegerMode: false,
          cleanRatesOnly: false,
        });
        get().recalculate();
      },

      toggleSection: (sectionId) => {
        set((state) => ({
          collapsedSections: {
            ...state.collapsedSections,
            [sectionId]: !state.collapsedSections[sectionId],
          },
        }));
      },

      addTarget: () => {
        const targets = [...get().targets];
        const id = `target_${Date.now()}`;
        targets.push({ id, itemId: 'turbocharger', rate: 1 });
        set({ targets });
        get().recalculate();
      },

      removeTarget: (id) => {
        const targets = get().targets.filter((t) => t.id !== id);
        if (targets.length === 0) return; // don't remove last target
        // Sync aliases from first target
        set({
          targets,
          targetItemId: targets[0].itemId,
          targetRate: targets[0].rate,
        });
        get().recalculate();
      },

      updateTarget: (id, partial) => {
        const targets = get().targets.map((t) =>
          t.id === id ? { ...t, ...partial } : t
        );
        set({
          targets,
          // Keep aliases in sync with first target
          targetItemId: targets[0].itemId,
          targetRate: targets[0].rate,
        });
        get().recalculate();
      },

      recalculate: () => {
        const {
          targetItemId,
          targetRate,
          targets,
          recipeSelections,
          buildingLevels,
          beltSpeed,
          resourceConstraints,
          worldGen2,
        } = get();

        const extractorRates = getExtractorRates(worldGen2);
        const isMultiTarget = targets.length > 1;

        if (!isMultiTarget) {
          // Single target path (preserves optimization panel behavior)
          if (!targetItemId) {
            set({ productionResult: null, beltResult: null, fractionalProposals: [], reverseResult: null, referenceResult: null, bestPracticalRates: null });
            return;
          }

          if (targetRate <= 0) {
            set({ productionResult: null, beltResult: null, fractionalProposals: [], reverseResult: null, referenceResult: null, bestPracticalRates: null });
            return;
          }

          // Always calculate production from targetRate
          const result = calculateProduction(
            targetItemId,
            targetRate,
            recipeSelections,
            buildingLevels,
            extractorRates
          );

          const beltResult = calculateBeltRequirements(result, beltSpeed);
          const proposals = generateProposals(result, targetRate, beltSpeed);

          // If resource constraints exist, compute reverse result for utilization info
          let reverseResult: ReverseResult | null = null;
          if (resourceConstraints.length > 0) {
            const reverse = calculateFromResources(
              targetItemId,
              resourceConstraints,
              recipeSelections,
              buildingLevels,
              beltSpeed,
              extractorRates
            );
            reverseResult = reverse;
          }

          // Always compute reference result at rate=1 and best practical rates
          const referenceResult = calculateProduction(
            targetItemId,
            1,
            recipeSelections,
            buildingLevels,
            extractorRates
          );
          const extractorLevel = buildingLevels.get('extractor') ?? 1;
          let bestPracticalRates: BestPracticalRates | null = null;
          try {
            bestPracticalRates = findBestPracticalRates(referenceResult, extractorLevel, beltSpeed, extractorRates);
          } catch {
            // Complex recipes can exceed optimization limits; degrade gracefully
            bestPracticalRates = null;
          }

          set({ productionResult: result, beltResult, fractionalProposals: proposals, reverseResult, referenceResult, bestPracticalRates });
        } else {
          // Multi-target path
          const validTargets = targets.filter((t) => t.itemId && t.rate > 0);
          if (validTargets.length === 0) {
            set({ productionResult: null, beltResult: null, fractionalProposals: [], reverseResult: null, referenceResult: null, bestPracticalRates: null });
            return;
          }

          const result = calculateMultiProduction(
            validTargets.map((t) => ({ itemId: t.itemId, rate: t.rate })),
            recipeSelections,
            buildingLevels,
            extractorRates
          );

          const beltResult = calculateBeltRequirements(result, beltSpeed);

          set({
            productionResult: result,
            beltResult,
            fractionalProposals: [],
            reverseResult: null,
            referenceResult: null,
            bestPracticalRates: null,
          });
        }
      },
    }),
    {
      name: 'builderment-optimizer',
      partialize: (state) => ({
        targetItemId: state.targetItemId,
        targetRate: state.targetRate,
        targets: state.targets,
        recipeSelections: mapToObject(state.recipeSelections),
        buildingLevels: mapToObject(state.buildingLevels),
        beltSpeed: state.beltSpeed,
        showBeltInfo: state.showBeltInfo,
        viewMode: state.viewMode,
        theme: state.theme,
        optimizationDetailLevel: state.optimizationDetailLevel,
        blueprintOrientation: state.blueprintOrientation,
        blueprintMergeMode: state.blueprintMergeMode,
        cleanRatesOnly: state.cleanRatesOnly,
        autoIntegerMode: state.autoIntegerMode,
        worldGen2: state.worldGen2,
        resourceConstraints: state.resourceConstraints,
        collapsedSections: state.collapsedSections,
        blueprintProgress: mapToObject(state.blueprintProgress),
        blueprintPositions: mapToObject(state.blueprintPositions),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (state) {
          // Convert persisted objects back to Maps
          state.recipeSelections = objectToMap(state.recipeSelections as unknown as Record<string, string>);
          state.buildingLevels = objectToMap(state.buildingLevels as unknown as Record<BuildingType, number>);

          state.blueprintProgress = objectToMap(state.blueprintProgress as unknown as Record<string, BlueprintProgressState>);
          // Migrate old boolean `true` values to 'completed'
          for (const [key, value] of state.blueprintProgress) {
            if (value === true as unknown) {
              state.blueprintProgress.set(key, 'completed');
            }
          }
          state.blueprintPositions = objectToMap(state.blueprintPositions as unknown as Record<string, { x: number; y: number }>);

          // Migrate persisted 'graph' viewMode to 'blueprint'
          if ((state.viewMode as string) === 'graph') {
            state.viewMode = 'blueprint';
          }

          // Migrate old format: create targets from targetItemId/targetRate
          if (!state.targets || !Array.isArray(state.targets) || state.targets.length === 0) {
            state.targets = [{ id: 'default', itemId: state.targetItemId, rate: state.targetRate }];
          }

          // Ensure all building types have default levels
          const defaults = getDefaultBuildingLevels();
          for (const [key, value] of defaults) {
            if (!state.buildingLevels.has(key)) {
              state.buildingLevels.set(key, value);
            }
          }

          // Detect system color scheme for first-time visitors (no persisted theme)
          if (error || !localStorage.getItem('builderment-optimizer')) {
            const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
            state.theme = prefersDark ? 'dark' : 'light';
          }

          // URL params override persisted state
          const urlState = parseURLParams();
          if (urlState.targets && urlState.targets.length > 0) {
            state.targets = urlState.targets.map((t, i) => ({
              id: i === 0 ? 'default' : `target_${i}`,
              itemId: t.itemId,
              rate: t.rate,
            }));
            state.targetItemId = state.targets[0].itemId;
            state.targetRate = state.targets[0].rate;
          } else {
            if (urlState.item) state.targetItemId = urlState.item;
            if (urlState.rate !== undefined) state.targetRate = urlState.rate;
            // Sync targets[0] with single-target URL params
            if (urlState.item || urlState.rate !== undefined) {
              state.targets = [{ id: 'default', itemId: state.targetItemId, rate: state.targetRate }];
            }
          }
          if (urlState.belt !== undefined) state.beltSpeed = urlState.belt;
          if (urlState.view) state.viewMode = urlState.view;
          if (urlState.merge) state.blueprintMergeMode = urlState.merge;
          if (urlState.recipes) {
            for (const [k, v] of urlState.recipes) {
              state.recipeSelections.set(k, v);
            }
          }
          if (urlState.levels) {
            for (const [k, v] of urlState.levels) {
              state.buildingLevels.set(k as BuildingType, v);
            }
          }
          if (urlState.worldGen2 !== undefined) state.worldGen2 = urlState.worldGen2;

          // Trigger initial calculation
          setTimeout(() => state.recalculate(), 0);
        }
      },
    }
  )
);

// Subscribe to state changes and update URL
if (typeof window !== 'undefined') {
  useStore.subscribe((state) => {
    updateURL({
      targetItemId: state.targetItemId,
      targetRate: state.targetRate,
      beltSpeed: state.beltSpeed,
      viewMode: state.viewMode,
      blueprintMergeMode: state.blueprintMergeMode,
      recipeSelections: state.recipeSelections,
      buildingLevels: state.buildingLevels,
      targets: state.targets,
      worldGen2: state.worldGen2,
    });
  });

  // Initialize calculation on first load
  setTimeout(() => {
    useStore.getState().recalculate();
  }, 0);
}
