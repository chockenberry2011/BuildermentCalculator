import { ProductionNode } from '../core/ProductionCalculator';
import { BUILDINGS } from '../data/buildings';
import { getItemColor } from '../data/itemColors';
import { useStore, type BlueprintProgressState } from '../store/useStore';
import { BeltCalculationResult } from '../core/BeltCalculator';
import { BuildingIcon } from './BuildingIcon';
import { BeltBadge } from './BeltBadge';
import { EditableBuildingCount } from './EditableBuildingCount';
import { SplitBadge } from './SplitBadge';
import { LevelBadge } from './LevelBadge';

interface TreeNodeProps {
  node: ProductionNode;
  depth: number;
  isDark: boolean;
  beltResult: BeltCalculationResult | null;
  setRateFromItemBuildingCount: (itemId: string, count: number) => void;
  constraintSource: { type: string; itemId?: string };
  blueprintProgress: Map<string, BlueprintProgressState>;
  setBlueprintProgressState: (nodeKey: string, state: BlueprintProgressState | null) => void;
}

function TreeNode({ node, depth, isDark, beltResult, setRateFromItemBuildingCount, constraintSource, blueprintProgress, setBlueprintProgressState }: TreeNodeProps) {
  const indent = Math.min(depth * 16, 64);

  const buildingInfo = node.building;
  const buildingName = buildingInfo
    ? BUILDINGS[buildingInfo.buildingType]?.name ?? buildingInfo.buildingType
    : '';

  const rate = node.ratePerMinute.toNumber();
  const isConstraint = constraintSource.type === 'itemBuilding' && constraintSource.itemId === node.itemId;

  // Derive 3-state progress from base key + any split keys
  const nodeProgressState: BlueprintProgressState | false = (() => {
    const baseState = blueprintProgress.get(node.itemId);
    const splitPrefix = `${node.itemId}_for_`;
    const splitKeys = [...blueprintProgress.keys()].filter(k => k.startsWith(splitPrefix));
    const allKeys = baseState ? [node.itemId, ...splitKeys] : splitKeys;

    if (allKeys.length === 0) return false;

    const allCompleted = allKeys.every(k => blueprintProgress.get(k) === 'completed');
    if (allCompleted) return 'completed';

    // Any key set at all means in progress
    return 'in_progress';
  })();

  // Find belt connection for this node (from this item to its parent)
  const beltConnection = beltResult
    ? beltResult.connections.find((c) => c.fromItemId === node.itemId)
    : null;

  return (
    <div className="font-mono text-xs sm:text-sm">
      <div
        className={`flex flex-wrap sm:flex-nowrap items-center py-1 rounded px-2 cursor-pointer ${
          nodeProgressState === 'completed'
            ? isDark
              ? 'bg-green-900/60 hover:bg-green-900/80'
              : 'bg-green-100 hover:bg-green-200'
            : nodeProgressState === 'in_progress'
              ? isDark
                ? 'bg-amber-900/40 hover:bg-amber-900/60'
                : 'bg-amber-50 hover:bg-amber-100'
              : isDark
                ? 'hover:bg-gray-700/50'
                : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${indent + 8}px`, opacity: nodeProgressState === 'completed' ? 0.6 : 1 }}
        onClick={() => {
          // Cycle: false → in_progress → completed → false
          const nextState: BlueprintProgressState | null =
            !nodeProgressState ? 'in_progress' :
            nodeProgressState === 'in_progress' ? 'completed' :
            null;

          // Set base key + all split keys to the same target state
          const splitPrefix = `${node.itemId}_for_`;
          const splitKeys = [...blueprintProgress.keys()].filter(k => k.startsWith(splitPrefix));
          for (const k of splitKeys) {
            setBlueprintProgressState(k, nextState);
          }
          setBlueprintProgressState(node.itemId, nextState);
        }}
      >
        {/* Left side: connector + name + rate + dashed fill — fixed width so inputs align */}
        <div className="flex items-center gap-2 w-full sm:w-[280px] sm:flex-shrink-0">
          {depth > 0 && (
            <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>
              {depth === 1 ? '├──' : '└──'}
            </span>
          )}
          <span className="font-medium truncate" style={{ color: getItemColor(node.itemId) }}>
            {node.itemName}
          </span>
          <span className={`flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {rate.toFixed(2)}/min
          </span>
          {buildingInfo && (
            <div
              className="flex-1 min-w-[8px] border-b-2 border-dashed self-center"
              style={{ height: '0.5em', borderColor: getItemColor(node.itemId) + '90' }}
            />
          )}
        </div>

        {/* Right side: building info — aligned across siblings */}
        {buildingInfo && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto pl-6 sm:pl-0 ml-0 sm:ml-2">
            <EditableBuildingCount
              count={buildingInfo.count}
              isConstraint={isConstraint}
              onSetCount={(newCount) => setRateFromItemBuildingCount(node.itemId, newCount)}
              isDark={isDark}
            />
            <BuildingIcon buildingType={buildingInfo.buildingType} itemId={node.itemId} />
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {buildingName}
              {buildingInfo.level > 1 && (
                <span className={`text-xs ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Lv{buildingInfo.level}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Belt info — only show for multi-belt or near-capacity */}
        {beltConnection && (
          <BeltBadge
            beltConnection={beltConnection}
            buildingCount={buildingInfo?.count}
            isDark={isDark}
          />
        )}

        {buildingInfo && !buildingInfo.count.isInteger() && depth > 0 && (() => {
          const hasUpstreamFraction = node.children.some(
            child => child.building && !child.building.count.isInteger()
          );
          return <SplitBadge count={buildingInfo.count} isDark={isDark} autoRegulated={hasUpstreamFraction} />;
        })()}

        {buildingInfo && buildingInfo.level < buildingInfo.configuredLevel && (
          <LevelBadge building={buildingInfo} isDark={isDark} />
        )}
      </div>

      {/* Children */}
      {node.children.map((child, i) => (
        <TreeNode
          key={`${child.itemId}-${i}`}
          node={child}
          depth={depth + 1}
          isDark={isDark}
          beltResult={beltResult}
          setRateFromItemBuildingCount={setRateFromItemBuildingCount}
          constraintSource={constraintSource}
          blueprintProgress={blueprintProgress}
          setBlueprintProgressState={setBlueprintProgressState}
        />
      ))}
    </div>
  );
}

export function ProductionTree() {
  const productionResult = useStore((s) => s.productionResult);
  const beltResult = useStore((s) => s.beltResult);
  const targetRate = useStore((s) => s.targetRate);
  const theme = useStore((s) => s.theme);
  const setRateFromItemBuildingCount = useStore((s) => s.setRateFromItemBuildingCount);
  const constraintSource = useStore((s) => s.constraintSource);
  const blueprintProgress = useStore((s) => s.blueprintProgress);
  const setBlueprintProgressState = useStore((s) => s.setBlueprintProgressState);
  const isDark = theme === 'dark';

  if (!productionResult) {
    return (
      <div className={`italic p-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Select an item to see production requirements
      </div>
    );
  }

  const isMultiRoot = productionResult.root.itemId === '__multi_root__';

  return (
    <div className="overflow-x-auto">
      {isMultiRoot ? (
        // Multi-target: render each child as a separate section
        productionResult.root.children.map((child, i) => (
          <div key={`${child.itemId}-${i}`}>
            <div className={`mb-3 pb-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} ${i > 0 ? 'mt-4' : ''}`}>
              <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {child.itemName}
              </span>
              <span className={`ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                @ {child.ratePerMinute.toNumber().toFixed(2)}/min
              </span>
            </div>
            <TreeNode
              node={child}
              depth={0}
              isDark={isDark}
              beltResult={beltResult}
              setRateFromItemBuildingCount={setRateFromItemBuildingCount}
              constraintSource={constraintSource}
              blueprintProgress={blueprintProgress}
              setBlueprintProgressState={setBlueprintProgressState}
            />
          </div>
        ))
      ) : (
        // Single target: original behavior
        <>
          <div className={`mb-3 pb-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {productionResult.root.itemName}
            </span>
            <span className={`ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              @ {targetRate.toFixed(2)}/min
            </span>
          </div>
          <TreeNode
            node={productionResult.root}
            depth={0}
            isDark={isDark}
            beltResult={beltResult}
            setRateFromItemBuildingCount={setRateFromItemBuildingCount}
            constraintSource={constraintSource}
            blueprintProgress={blueprintProgress}
            setBlueprintProgressState={setBlueprintProgressState}
          />
        </>
      )}
    </div>
  );
}
