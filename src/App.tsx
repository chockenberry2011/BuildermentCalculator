import { useEffect, useRef, useState } from 'react';
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
import { getItem } from './data/items';

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

function StickyTargetSummary({ visible, isDark }: { visible: boolean; isDark: boolean }) {
  const targets = useStore((s) => s.targets);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm transition-opacity ${
        isDark
          ? 'bg-gray-800/95 border-gray-700'
          : 'bg-white/95 border-gray-200'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1.5 flex items-center gap-4 overflow-x-auto">
        <span className={`text-xs font-medium shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Building</span>
        <div className="flex items-center gap-3 min-w-0">
          {targets.map((target, i) => {
            const item = getItem(target.itemId);
            return (
              <span key={target.id} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <span className={`${isDark ? 'text-gray-600' : 'text-gray-300'}`}>+</span>}
                <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {item?.name ?? target.itemId}
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {target.rate}/min
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
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

  // Track when TargetList scrolls out of view
  const targetListRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const el = targetListRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      <StickyTargetSummary visible={showStickyBar} isDark={isDark} />

      {/* Header */}
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 sm:px-6 py-3 sm:py-4`}>
        <div className="max-w-6xl mx-auto flex flex-row items-center justify-between gap-4">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Builderment Resource Calculator
              <span className="ml-2 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400 border border-amber-500/30 dark:border-amber-400/30" title="Under active development — things may change or break">
                BETA
              </span>
            </h1>
            <p className={`hidden sm:block text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Map out your entire production chain — under active development
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
      <main className="py-4 sm:py-6">
        {/* Zone 1: Constrained top */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div ref={targetListRef} className={`group/sticky ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-2 sm:p-3 mb-4 sm:mb-6 shadow-sm`}>
            <TargetList />
          </div>

          {bestPracticalRates && (
            <div className="mb-4 sm:mb-6">
              <CollapsibleSection title="Optimal Rates" isOpen={!collapsedSections['Optimal Rates']} onToggle={() => toggleSection('Optimal Rates')}>
                <OptimizationPanel />
              </CollapsibleSection>
            </div>
          )}
        </div>

        {/* Zone 2: Full-width production view */}
        <div className="px-4 sm:px-6 mb-4 sm:mb-6">
          <CollapsibleSection title="Production View" isOpen={!collapsedSections['Production View']} onToggle={() => toggleSection('Production View')} headerRight={<ViewToggle />}>
            {viewMode === 'tree' ? <ProductionTree /> : <BlueprintFlowView />}
          </CollapsibleSection>
        </div>

        {/* Zone 3: Constrained bottom */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-6">
          {productionResult && (
            <CollapsibleSection title="Raw Resources" subtitle="Total resources needed from the map" isOpen={!collapsedSections['Raw Resources']} onToggle={() => toggleSection('Raw Resources')}>
              <SummaryTable />
            </CollapsibleSection>
          )}

          <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-2 sm:space-y-4 lg:space-y-0">
            <div className="space-y-2 sm:space-y-4">
              <CollapsibleSection title="Extractors" subtitle="Extractors needed for current production" isOpen={!collapsedSections['Extractors']} onToggle={() => toggleSection('Extractors')}>
                <ResourceInput />
              </CollapsibleSection>

              <CollapsibleSection title="Settings" subtitle="Belt tier and display options" isOpen={!collapsedSections['Settings']} onToggle={() => toggleSection('Settings')}>
                <SettingsSection />
              </CollapsibleSection>
            </div>

            <div className="space-y-2 sm:space-y-4">
              <CollapsibleSection title="Recipes" subtitle="Choose alternate recipes for items" isOpen={!collapsedSections['Recipes']} onToggle={() => toggleSection('Recipes')}>
                <RecipePickerList />
              </CollapsibleSection>

              <CollapsibleSection title="Recipe Book" subtitle="Verify recipe data" isOpen={!collapsedSections['Recipe Book']} onToggle={() => toggleSection('Recipe Book')}>
                <RecipeBook />
              </CollapsibleSection>
            </div>
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
