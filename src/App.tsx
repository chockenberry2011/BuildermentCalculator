import { useEffect } from 'react';
import { ItemSelector } from './components/ItemSelector';
import { RateInput } from './components/RateInput';
import { ResourceInput } from './components/ResourceInput';
import { BuildingLevelConfig } from './components/BuildingLevelConfig';
import { RecipePickerList } from './components/RecipePicker';
import { BeltConfig } from './components/BeltConfig';
import { ProductionTree } from './components/ProductionTree';
import { BlueprintFlowView } from './components/BlueprintFlowView';
import { SummaryTable } from './components/SummaryTable';
import { OptimizationPanel } from './components/OptimizationPanel';
import { ViewToggle } from './components/ViewToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { ExportButton } from './components/ExportButton';
import { CollapsibleSection } from './components/CollapsibleSection';
import { useStore } from './store/useStore';

export default function App() {
  const viewMode = useStore((s) => s.viewMode);
  const theme = useStore((s) => s.theme);
  const recalculate = useStore((s) => s.recalculate);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Initial calculation
  useEffect(() => {
    recalculate();
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 sm:px-6 py-3 sm:py-4`}>
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-4">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Builderment Optimizer
            </h1>
            <p className={`hidden sm:block text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Find optimal production scales with integer building counts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Zone A: Always-visible top bar with item selector + rate input */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 sticky top-0 z-10`}>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <ItemSelector />
            </div>
            <div className="flex-1">
              <RateInput />
            </div>
          </div>
        </div>

        {/* Zone B: The grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Results - first on mobile, center on desktop */}
          <div className="md:col-span-2 lg:col-span-2 lg:order-2 space-y-3 sm:space-y-4 order-1 md:order-2">
            {/* View Toggle */}
            <div className="flex justify-between items-center">
              <ViewToggle />
            </div>

            {/* Production View */}
            {viewMode === 'tree' ? <ProductionTree /> : <BlueprintFlowView />}

            {/* Summary Table */}
            <SummaryTable />
          </div>

          {/* Optimization - second on mobile, sidebar on desktop */}
          <div className="md:col-span-1 lg:col-span-1 lg:order-3 order-2 md:order-3">
            <OptimizationPanel />
          </div>

          {/* Config sidebar - third on mobile (collapsed), first on desktop */}
          <div className="md:col-span-1 lg:col-span-1 space-y-2 sm:space-y-4 order-3 md:order-1">
            <CollapsibleSection title="Extractors" mobileOnly>
              <ResourceInput />
            </CollapsibleSection>

            <CollapsibleSection title="Building Levels" mobileOnly>
              <BuildingLevelConfig />
            </CollapsibleSection>

            <CollapsibleSection title="Recipes" mobileOnly>
              <RecipePickerList />
            </CollapsibleSection>

            <CollapsibleSection title="Belt Speed" mobileOnly>
              <BeltConfig />
            </CollapsibleSection>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t px-4 sm:px-6 py-4 mt-4 sm:mt-8`}>
        <div className={`max-w-7xl mx-auto text-center ${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm`}>
          <p>
            Builderment Optimizer - Find optimal building ratios for your factory
          </p>
          <p className={`hidden sm:block mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Data based on Builderment game. Not affiliated with Builderment or its developers.
          </p>
        </div>
      </footer>
    </div>
  );
}
