import { useState } from 'react';
import { Panel } from '@xyflow/react';
import { useZoomLevel } from '../../hooks/useZoomLevel';

interface LegendItem {
  id: string;
  name: string;
  color: string;
}

interface BlueprintLegendProps {
  items: LegendItem[];
  isDark: boolean;
}

export function BlueprintLegend({ items, isDark }: BlueprintLegendProps) {
  const zoomLevel = useZoomLevel();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (zoomLevel !== 'mini' || items.length === 0) return null;

  const bg = isDark ? 'bg-gray-800/95' : 'bg-white/95';
  const border = isDark ? 'border-gray-600' : 'border-gray-300';
  const text = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <Panel position="top-left">
      <div className={`${bg} border ${border} rounded-lg shadow-lg backdrop-blur-sm`}>
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 w-full text-left text-xs font-medium ${text}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={subtext}
            style={{ transform: isCollapsed ? 'rotate(-90deg)' : undefined, transition: 'transform 0.15s' }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          Legend
          <span className={`${subtext} font-normal`}>({items.length})</span>
        </button>
        {!isCollapsed && (
          <div className={`px-2.5 pb-2 max-h-48 overflow-y-auto border-t ${border}`}>
            <div className="grid gap-0.5 pt-1.5">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span
                    className="shrink-0 rounded-full"
                    style={{ width: 10, height: 10, backgroundColor: item.color }}
                  />
                  <span className={`text-[11px] ${text} truncate`}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
