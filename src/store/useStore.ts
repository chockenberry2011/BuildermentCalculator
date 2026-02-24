import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BuildingType, EXTRACTOR_RATES } from '../data/buildings';
import { DEFAULT_BELT_SPEED } from '../data/belts';
import {
  calculateProduction,
  ProductionResult,
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
import { findPracticalRates, PracticalCandidate } from '../core/PracticalRateOptimizer';

export type ViewMode = 'tree' | 'blueprint';
export type ThemeMode = 'light' | 'dark';
export type OptimizationDetailLevel = 'minimal' | 'standard' | 'full';

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

// Track which constraint is currently driving the calculation
export type ConstraintSource =
  | { type: 'rate' }
  | { type: 'building'; buildingType: BuildingType }
  | { type: 'resource'; resourceId: string }
  | { type: 'extractor'; resourceId: string };

interface CalculatorState {
  // Target settings
  targetItemId: string;
  targetRate: number;

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

  // Feature 1: Clean rates filter
  cleanRatesOnly: boolean;

  // Feature 4: Auto-integer mode
  autoIntegerMode: boolean;

  // Feature 2: Fractional proposals (computed)
  fractionalProposals: FractionalProposal[];

  // Feature 3: Resource constraints
  resourceConstraints: ResourceConstraint[];
  reverseResult: ReverseResult | null;

  // Extractor budget mode
  extractorBudget: number | null;
  practicalCandidates: PracticalCandidate[];

  // Always-computed practical rate recommendations
  referenceResult: ProductionResult | null;
  bestPracticalRates: BestPracticalRates | null;

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
  toggleTheme: () => void;
  setBeltSpeed: (speed: number) => void;
  toggleBeltInfo: () => void;
  setCleanRatesOnly: (value: boolean) => void;
  setAutoIntegerMode: (value: boolean) => void;
  applyBestRate: () => void;
  setExtractorBudget: (budget: number | null) => void;
  setResourceConstraints: (constraints: ResourceConstraint[]) => void;
  setRateFromBuildingCount: (buildingType: BuildingType, count: number) => void;
  setRateFromResourceAmount: (resourceId: string, ratePerMinute: number) => void;
  setRateFromExtractorCount: (resourceId: string, extractorCount: number) => void;
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

export const useStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
      // Initial state
      targetItemId: 'turbocharger',
      targetRate: 1,
      recipeSelections: new Map(),
      buildingLevels: getDefaultBuildingLevels(),
      beltSpeed: DEFAULT_BELT_SPEED,
      showBeltInfo: true,
      viewMode: 'tree',
      theme: 'dark',
      optimizationDetailLevel: 'standard',
      cleanRatesOnly: false,
      autoIntegerMode: false,
      fractionalProposals: [],
      resourceConstraints: [],
      reverseResult: null,
      extractorBudget: null,
      practicalCandidates: [],
      referenceResult: null,
      bestPracticalRates: null,
      constraintSource: { type: 'rate' } as ConstraintSource,
      productionResult: null,
      beltResult: null,

      // Actions
      setTargetItem: (itemId) => {
        set({ targetItemId: itemId });
        get().recalculate();
        if (get().autoIntegerMode) {
          get().applyBestRate();
        }
      },

      setTargetRate: (rate) => {
        set({ targetRate: rate, constraintSource: { type: 'rate' } });
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

      applyBestRate: () => {
        const { bestPracticalRates, targetItemId, recipeSelections, buildingLevels, beltSpeed } = get();

        // Prefer bestSimple (fewest extractors with good fractions), fall back to bestAllInteger
        const best = bestPracticalRates?.bestSimple ?? bestPracticalRates?.bestAllInteger;
        if (best) {
          set({ targetRate: best.rate });
          get().recalculate();
          return;
        }

        // Fallback to existing logic
        if (!targetItemId) return;
        const refResult = calculateProduction(targetItemId, 1, recipeSelections, buildingLevels);
        const bestCandidate = findBestAllIntegerScale(refResult, 100, beltSpeed);
        if (bestCandidate) {
          set({ targetRate: bestCandidate.scale });
          get().recalculate();
        }
      },

      setExtractorBudget: (budget) => {
        set({ extractorBudget: budget });
        get().recalculate();
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
        const { targetItemId, recipeSelections, buildingLevels } = get();
        if (!targetItemId || count <= 0) return;

        // Calculate production at rate=1 to get the building count per unit rate
        const referenceResult = calculateProduction(
          targetItemId,
          1,
          recipeSelections,
          buildingLevels
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

      setRateFromResourceAmount: (resourceId, ratePerMinute) => {
        const { targetItemId, recipeSelections, buildingLevels } = get();
        if (!targetItemId || ratePerMinute <= 0) return;

        // Calculate production at rate=1 to get the resource rate per unit output
        const referenceResult = calculateProduction(
          targetItemId,
          1,
          recipeSelections,
          buildingLevels
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
        const { targetItemId, recipeSelections, buildingLevels, resourceConstraints } = get();
        if (!targetItemId || extractorCount <= 0) return;

        const extractorLevel = buildingLevels.get('extractor') ?? 1;
        const ratePerExtractor = EXTRACTOR_RATES[extractorLevel - 1];
        const resourceRate = extractorCount * ratePerExtractor;

        // Calculate production at rate=1 to get the resource rate per unit output
        const referenceResult = calculateProduction(
          targetItemId,
          1,
          recipeSelections,
          buildingLevels
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

      recalculate: () => {
        const {
          targetItemId,
          targetRate,
          recipeSelections,
          buildingLevels,
          beltSpeed,
          resourceConstraints,
          extractorBudget,
        } = get();

        if (!targetItemId) {
          set({ productionResult: null, beltResult: null, fractionalProposals: [], reverseResult: null, practicalCandidates: [], referenceResult: null, bestPracticalRates: null });
          return;
        }

        if (targetRate <= 0) {
          set({ productionResult: null, beltResult: null, fractionalProposals: [], reverseResult: null, practicalCandidates: [], referenceResult: null, bestPracticalRates: null });
          return;
        }

        // Always calculate production from targetRate
        const result = calculateProduction(
          targetItemId,
          targetRate,
          recipeSelections,
          buildingLevels
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
            beltSpeed
          );
          reverseResult = reverse;
        }

        // Always compute reference result at rate=1 and best practical rates
        const referenceResult = calculateProduction(
          targetItemId,
          1,
          recipeSelections,
          buildingLevels
        );
        const extractorLevel = buildingLevels.get('extractor') ?? 1;
        let bestPracticalRates: BestPracticalRates | null = null;
        try {
          bestPracticalRates = findBestPracticalRates(referenceResult, extractorLevel, beltSpeed);
        } catch {
          // Complex recipes can exceed optimization limits; degrade gracefully
          bestPracticalRates = null;
        }

        // Compute practical rate candidates if extractor budget is set
        let practicalCandidates: PracticalCandidate[] = [];
        if (extractorBudget != null && extractorBudget > 0) {
          const practicalResult = findPracticalRates(referenceResult, extractorBudget, extractorLevel, beltSpeed);
          practicalCandidates = practicalResult.candidates;
        }

        set({ productionResult: result, beltResult, fractionalProposals: proposals, reverseResult, practicalCandidates, referenceResult, bestPracticalRates });
      },
    }),
    {
      name: 'builderment-optimizer',
      partialize: (state) => ({
        targetItemId: state.targetItemId,
        targetRate: state.targetRate,
        recipeSelections: mapToObject(state.recipeSelections),
        buildingLevels: mapToObject(state.buildingLevels),
        beltSpeed: state.beltSpeed,
        showBeltInfo: state.showBeltInfo,
        viewMode: state.viewMode,
        theme: state.theme,
        optimizationDetailLevel: state.optimizationDetailLevel,
        cleanRatesOnly: state.cleanRatesOnly,
        autoIntegerMode: state.autoIntegerMode,
        resourceConstraints: state.resourceConstraints,
        extractorBudget: state.extractorBudget,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert persisted objects back to Maps
          state.recipeSelections = objectToMap(state.recipeSelections as unknown as Record<string, string>);
          state.buildingLevels = objectToMap(state.buildingLevels as unknown as Record<BuildingType, number>);

          // Migrate persisted 'graph' viewMode to 'blueprint'
          if ((state.viewMode as string) === 'graph') {
            state.viewMode = 'blueprint';
          }

          // Ensure all building types have default levels
          const defaults = getDefaultBuildingLevels();
          for (const [key, value] of defaults) {
            if (!state.buildingLevels.has(key)) {
              state.buildingLevels.set(key, value);
            }
          }

          // Trigger initial calculation
          setTimeout(() => state.recalculate(), 0);
        }
      },
    }
  )
);

// Initialize calculation on first load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useStore.getState().recalculate();
  }, 0);
}
