import { useEffect } from 'react';
import { TargetList } from './components/TargetList';
import { ResourceInput } from './components/ResourceInput';
import { RecipePickerList } from './components/RecipePicker';
import { SettingsSection } from './components/SettingsSection';
import { RecipeBook } from './components/RecipeBook';
import { ProductionTree } from './components/ProductionTree';
import { BlueprintFlowView } from './components/BlueprintFlowView';
import { SummaryTable } from './components/SummaryTable';
import { OptimizationPanel } from './components/OptimizationPanel';
import { ViewToggle } from './components/ViewToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { ExportButton } from './components/ExportButton';
import { CollapsibleSection } from './components/CollapsibleSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './store/useStore';

function ResetButton() {
  const theme = useStore((s) => s.theme);
  const resetCalculator = useStore((s) => s.resetCalculator);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={resetCalculator}
      title="Reset Calculator"
      className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition text-sm ${
        isDark
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span className="hidden sm:inline">Reset</span>
    </button>
  );
}

function AppContent() {
  const viewMode = useStore((s) => s.viewMode);
  const theme = useStore((s) => s.theme);
  const recalculate = useStore((s) => s.recalculate);
  const collapsedSections = useStore((s) => s.collapsedSections);
  const toggleSection = useStore((s) => s.toggleSection);
  const bestPracticalRates = useStore((s) => s.bestPracticalRates);
  const productionResult = useStore((s) => s.productionResult);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Initial calculation
  useEffect(() => {
    recalculate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 sm:px-6 py-3 sm:py-4`}>
        <div className="max-w-6xl mx-auto flex flex-row items-center justify-between gap-4">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Builderment Resource Calculator
            </h1>
            <p className={`hidden sm:block text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Map out your entire production chain
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ResetButton />
            <ExportButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Zone A: Always-visible top bar with item selector + rate input */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 sticky top-0 z-10`}>
          <TargetList />
        </div>

        {/* Zone B: 3-column grid (1 sidebar + 2 center) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Center column (2 cols on desktop) — first on mobile */}
          <div className="lg:col-span-2 lg:order-2 space-y-3 sm:space-y-4 order-1">
            {/* Optimization Panel */}
            {bestPracticalRates && (
              <CollapsibleSection title="Optimal Rates" isOpen={!collapsedSections['Optimal Rates']} onToggle={() => toggleSection('Optimal Rates')}>
                <OptimizationPanel />
              </CollapsibleSection>
            )}

            {/* Production View */}
            <CollapsibleSection title="Production View" isOpen={!collapsedSections['Production View']} onToggle={() => toggleSection('Production View')} headerRight={<ViewToggle />}>
              {viewMode === 'tree' ? <ProductionTree /> : <BlueprintFlowView />}
            </CollapsibleSection>

            {/* Production Summary */}
            {productionResult && (
              <CollapsibleSection title="Raw Resources" subtitle="Total resources needed from the map" isOpen={!collapsedSections['Raw Resources']} onToggle={() => toggleSection('Raw Resources')}>
                <SummaryTable />
              </CollapsibleSection>
            )}
          </div>

          {/* Config sidebar — second on mobile, first on desktop */}
          <div className="lg:col-span-1 lg:order-1 space-y-2 sm:space-y-4 order-2">
            <CollapsibleSection title="Extractors" subtitle="Extractors needed for current production" isOpen={!collapsedSections['Extractors']} onToggle={() => toggleSection('Extractors')}>
              <ResourceInput />
            </CollapsibleSection>

            <CollapsibleSection title="Recipes" subtitle="Choose alternate recipes for items" isOpen={!collapsedSections['Recipes']} onToggle={() => toggleSection('Recipes')}>
              <RecipePickerList />
            </CollapsibleSection>

            <CollapsibleSection title="Settings" subtitle="Belt tier and display options" isOpen={!collapsedSections['Settings']} onToggle={() => toggleSection('Settings')}>
              <SettingsSection />
            </CollapsibleSection>

            <CollapsibleSection title="Recipe Book" subtitle="Verify recipe data" isOpen={!collapsedSections['Recipe Book']} onToggle={() => toggleSection('Recipe Book')}>
              <RecipeBook />
            </CollapsibleSection>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t px-4 sm:px-6 py-4 mt-4 sm:mt-8`}>
        <div className={`max-w-6xl mx-auto text-center ${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm`}>
          <p>
            Builderment Resource Calculator — Factory planning made simple
          </p>
          <p className={`hidden sm:block mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Data based on Builderment game. Not affiliated with Builderment or its developers.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
