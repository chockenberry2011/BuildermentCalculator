import { useState } from 'react';
import { useStore } from '../store/useStore';
import { BUILDINGS } from '../data/buildings';
import { ITEMS } from '../data/items';
import { useDark } from '../hooks/useDark';

export function ExportButton() {
  const productionResult = useStore((s) => s.productionResult);
  const targetItemId = useStore((s) => s.targetItemId);
  const targetRate = useStore((s) => s.targetRate);
  const isDark = useDark();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleExport = () => {
    if (!productionResult) return;

    const item = ITEMS[targetItemId];

    let text = `Builderment Resource Calculator - Production Plan\n`;
    text += `========================\n\n`;
    text += `Target: ${item?.name ?? targetItemId} @ ${targetRate}/min\n`;
    text += `\n`;

    // Buildings
    text += `Buildings Required:\n`;
    text += `-------------------\n`;
    for (const [buildingType, count] of productionResult.buildingSummary) {
      const building = BUILDINGS[buildingType];
      const value = count.toNumber();
      const isInt = Math.abs(value - Math.round(value)) < 0.001;
      text += `${building?.name ?? buildingType}: ${isInt ? Math.round(value) : value.toFixed(2)}`;
      text += isInt ? ' \u2713\n' : '\n';
    }
    text += `\n`;

    // Raw resources
    text += `Raw Resources:\n`;
    text += `--------------\n`;
    for (const [itemId, rate] of productionResult.rawResources) {
      const rawItem = ITEMS[itemId];
      text += `${rawItem?.name ?? itemId}: ${rate.toNumber().toFixed(2)}/min\n`;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(text).then(
      () => {
        setFeedback('Copied!');
        setTimeout(() => setFeedback(null), 2000);
      },
      () => {
        setFeedback('Failed');
        setTimeout(() => setFeedback(null), 2000);
      }
    );
  };

  if (!productionResult) return null;

  return (
    <button
      onClick={handleExport}
      title="Copy to Clipboard"
      aria-label="Copy to clipboard"
      className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg active:scale-95 transition-[colors,transform] text-sm ${
        isDark
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
        />
      </svg>
      <span className="hidden sm:inline">{feedback ?? 'Copy to Clipboard'}</span>
    </button>
  );
}
