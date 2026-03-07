import { useMemo, useState } from 'react';
import { type FlatDAG, type FlatNode, computeTopologicalRanks } from '../../core/GraphFlattener';
import type { BlueprintProgressState } from '../../store/useStore';
import { BUILDINGS } from '../../data/buildings';
import { getItemColor } from '../../data/itemColors';
import { fractionSimplicityScore } from '../../core/RatioOptimizer';
import { getCountColor } from '../../core/countColor';
import { BuildingIcon } from '../BuildingIcon';
import { SplitBadge } from '../SplitBadge';
import { LevelBadge } from '../LevelBadge';
import { ProgressCheckbox, getProgressColors } from './ProgressCheckbox';
import { formatCount, formatRate } from './formatUtils';

interface MobileCardViewProps {
  dag: FlatDAG;
  isDark: boolean;
  rootItemIds: Set<string>;
  blueprintProgress: Map<string, BlueprintProgressState>;
  toggleBlueprintProgress: (nodeKey: string) => void;
  hasProgress: boolean;
  onClearProgress: () => void;
}

function MobileCard({
  node,
  inputEdges,
  isDark,
  isRoot,
  progressState,
  onToggleProgress,
}: {
  node: FlatNode;
  inputEdges: { fromItemId: string; itemName: string; rate: import('../../core/math/rational').Rational }[];
  isDark: boolean;
  isRoot: boolean;
  progressState: BlueprintProgressState | false;
  onToggleProgress: () => void;
}) {
  const accentColor = getItemColor(node.itemId);
  const building = node.building;
  const buildingType = building?.buildingType ?? 'workshop';
  const buildingName = building ? (BUILDINGS[building.buildingType]?.name ?? '') : '';
  const count = building ? formatCount(building.count) : null;
  const { bgClass, borderColor } = getProgressColors(progressState, isDark);
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div
      className={`rounded-lg shadow-sm ${bgClass} overflow-hidden ${isRoot ? 'ring-2 ring-blue-500' : ''}`}
      style={{ borderLeft: `4px solid ${accentColor}`, border: `1px solid ${borderColor}`, borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      <div className="px-3 py-2.5">
        {/* Header: name + rate + checkbox */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-sm ${textColor} truncate`}>
              {node.itemName}
            </div>
            {node.consumerItemName && (
              <div className={`text-xs ${subtextColor} truncate`}>
                {'\u2192'} {node.consumerItemName}
              </div>
            )}
          </div>
          <span className={`text-sm font-semibold ${textColor} shrink-0 tabular-nums`}>
            {formatRate(node.totalRate)}/min
          </span>
          <button
            className="shrink-0"
            onClick={onToggleProgress}
            title={progressState === 'completed' ? 'Reset progress' : progressState === 'in_progress' ? 'Mark as built' : 'Mark as in progress'}
          >
            <ProgressCheckbox progressState={progressState} isDark={isDark} size={20} />
          </button>
        </div>

        {/* Building info */}
        {count && (
          <div className={`mt-2 pt-2 flex items-center gap-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <BuildingIcon buildingType={buildingType} itemId={node.itemId} size="md" />
            <span
              className="text-sm font-semibold"
              style={{ color: getCountColor(fractionSimplicityScore(building!.count), isDark) }}
            >
              {count.text}x
            </span>
            <span className={`text-xs ${subtextColor}`}>
              {buildingName}
              {building && building.level > 1 ? ` Lv${building.level}` : ''}
            </span>
            <div className="flex-1" />
            {!count.isInteger && (
              <SplitBadge count={building!.count} isDark={isDark} />
            )}
            {building && building.level < building.configuredLevel && (
              <LevelBadge building={building} isDark={isDark} />
            )}
          </div>
        )}

        {/* Raw resource indicator */}
        {node.isRaw && !count && (
          <div className={`mt-1 text-xs ${subtextColor} italic`}>Raw resource</div>
        )}

        {/* Inputs */}
        {inputEdges.length > 0 && (
          <div className={`mt-2 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${subtextColor} mb-1`}>
              Inputs
            </div>
            {inputEdges.map((input) => (
              <div key={input.fromItemId} className="flex items-center gap-2 text-xs leading-5">
                <span
                  className="shrink-0 rounded-full"
                  style={{ width: 8, height: 8, backgroundColor: getItemColor(input.fromItemId) }}
                />
                <span className={`${textColor} truncate flex-1`}>{input.itemName}</span>
                <span className={`${subtextColor} shrink-0 tabular-nums`}>
                  {formatRate(input.rate)}/min
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileCardView({
  dag,
  isDark,
  rootItemIds,
  blueprintProgress,
  toggleBlueprintProgress,
  hasProgress,
  onClearProgress,
}: MobileCardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const ranks = useMemo(() => computeTopologicalRanks(dag), [dag]);

  const maxRank = useMemo(() => {
    let max = 0;
    for (const r of ranks.values()) {
      if (r > max) max = r;
    }
    return max;
  }, [ranks]);

  // Build input edges lookup
  const inputEdgesOf = useMemo(() => {
    const map = new Map<string, { fromItemId: string; itemName: string; rate: import('../../core/math/rational').Rational }[]>();
    for (const edge of dag.edges) {
      const list = map.get(edge.toNodeKey) ?? [];
      list.push({ fromItemId: edge.fromItemId, itemName: edge.itemName, rate: edge.rate });
      map.set(edge.toNodeKey, list);
    }
    return map;
  }, [dag.edges]);

  // Group nodes by rank (descending: final products first)
  const groupedNodes = useMemo(() => {
    const groups: { rank: number; label: string; nodes: FlatNode[] }[] = [];
    const byRank = new Map<number, FlatNode[]>();
    for (const node of dag.nodes) {
      const rank = ranks.get(node.nodeKey) ?? 0;
      const list = byRank.get(rank) ?? [];
      list.push(node);
      byRank.set(rank, list);
    }

    for (let r = maxRank; r >= 0; r--) {
      const nodes = byRank.get(r);
      if (!nodes || nodes.length === 0) continue;
      const label = r === maxRank ? 'Final Product' : r === 0 ? 'Raw Resources' : `Step ${r}`;
      groups.push({ rank: r, label, nodes });
    }
    return groups;
  }, [dag.nodes, ranks, maxRank]);

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedNodes;
    const q = searchQuery.toLowerCase();
    return groupedNodes
      .map((group) => ({
        ...group,
        nodes: group.nodes.filter((n) => n.itemName.toLowerCase().includes(q)),
      }))
      .filter((group) => group.nodes.length > 0);
  }, [groupedNodes, searchQuery]);

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const inputBg = isDark ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const labelColor = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`${bg} rounded-lg`}>
      {/* Sticky search bar */}
      <div className={`sticky top-0 z-10 ${bg} px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className={`flex-1 text-sm rounded-md border px-2.5 py-1.5 ${inputBg} outline-none focus:ring-1 focus:ring-blue-500`}
          />
          {hasProgress && (
            <button
              onClick={onClearProgress}
              className={`text-xs px-2 py-1.5 rounded-md ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Card list */}
      <div className="px-3 py-2 space-y-4">
        {filteredGroups.map((group) => (
          <div key={group.rank}>
            <div className={`text-xs font-semibold uppercase tracking-wider ${labelColor} mb-2`}>
              {group.label}
            </div>
            <div className="space-y-2">
              {group.nodes.map((node) => (
                <MobileCard
                  key={node.nodeKey}
                  node={node}
                  inputEdges={inputEdgesOf.get(node.nodeKey) ?? []}
                  isDark={isDark}
                  isRoot={rootItemIds.has(node.itemId)}
                  progressState={blueprintProgress.get(node.nodeKey) ?? false}
                  onToggleProgress={() => toggleBlueprintProgress(node.nodeKey)}
                />
              ))}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <div className={`text-center py-8 ${labelColor} italic text-sm`}>
            No items match "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
