import { ProductionNode } from '../core/ProductionCalculator';
import { BUILDINGS } from '../data/buildings';
import { getItemColor } from '../data/itemColors';
import { useStore } from '../store/useStore';
import { BeltCalculationResult } from '../core/BeltCalculator';
import { BuildingIcon } from './BuildingIcon';
import { BeltBadge } from './BeltBadge';
import { EditableBuildingCount } from './EditableBuildingCount';
import { SplitBadge } from './SplitBadge';

interface TreeNodeProps {
  node: ProductionNode;
  depth: number;
  isDark: boolean;
  beltResult: BeltCalculationResult | null;
  setRateFromItemBuildingCount: (itemId: string, count: number) => void;
  constraintSource: { type: string; itemId?: string };
  blueprintProgress: Map<string, boolean>;
  toggleBlueprintProgress: (nodeKey: string) => void;
}

function TreeNode({ node, depth, isDark, beltResult, setRateFromItemBuildingCount, constraintSource, blueprintProgress, toggleBlueprintProgress }: TreeNodeProps) {
  const indent = depth * 16;

  const buildingInfo = node.building;
  const buildingName = buildingInfo
    ? BUILDINGS[buildingInfo.buildingType]?.name ?? buildingInfo.buildingType
    : '';

  const rate = node.ratePerMinute.toNumber();
  const isConstraint = constraintSource.type === 'itemBuilding' && constraintSource.itemId === node.itemId;

  // Check progress: blueprint may store under "itemId" (merged) or "itemId_for_X" (split nodes)
  const isDone = (() => {
    if (blueprintProgress.get(node.itemId) === true) return true;
    const splitPrefix = `${node.itemId}_for_`;
    const splitKeys = [...blueprintProgress.keys()].filter(k => k.startsWith(splitPrefix));
    return splitKeys.length > 0 && splitKeys.every(k => blueprintProgress.get(k) === true);
  })();

  // Find belt connection for this node (from this item to its parent)
  const beltConnection = beltResult
    ? beltResult.connections.find((c) => c.fromItemId === node.itemId)
    : null;

  return (
    <div className="font-mono text-xs sm:text-sm">
      <div
        className={`flex items-center py-1 rounded px-2 cursor-pointer ${
          isDone
            ? isDark
              ? 'bg-green-900/60 hover:bg-green-900/80'
              : 'bg-green-100 hover:bg-green-200'
            : isDark
              ? 'hover:bg-gray-700/50'
              : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${indent + 8}px`, opacity: isDone ? 0.6 : 1 }}
        onClick={() => {
          // Toggle base key + any split keys (itemId_for_X) to the same target state
          const splitPrefix = `${node.itemId}_for_`;
          const splitKeys = [...blueprintProgress.keys()].filter(k => k.startsWith(splitPrefix));
          const willBeDone = !isDone;
          // Set all split keys to match the new state
          for (const k of splitKeys) {
            const isSet = blueprintProgress.get(k) === true;
            if (isSet !== willBeDone) toggleBlueprintProgress(k);
          }
          // Toggle the base key
          const baseIsSet = blueprintProgress.get(node.itemId) === true;
          if (baseIsSet !== willBeDone) toggleBlueprintProgress(node.itemId);
        }}
      >
        {/* Left side: connector + name + rate + dashed fill — fixed width so inputs align */}
        <div className="flex items-center gap-2 w-[220px] sm:w-[280px] flex-shrink-0">
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
          <div className="flex items-center gap-1.5 ml-2">
            <EditableBuildingCount
              count={buildingInfo.count}
              isConstraint={isConstraint}
              onSetCount={(newCount) => setRateFromItemBuildingCount(node.itemId, newCount)}
              isDark={isDark}
            />
            <BuildingIcon buildingType={buildingInfo.buildingType} />
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

        {buildingInfo && !buildingInfo.count.isInteger() && (
          <SplitBadge count={buildingInfo.count} isDark={isDark} />
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
          toggleBlueprintProgress={toggleBlueprintProgress}
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
  const toggleBlueprintProgress = useStore((s) => s.toggleBlueprintProgress);
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
    <div>
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
              toggleBlueprintProgress={toggleBlueprintProgress}
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
            toggleBlueprintProgress={toggleBlueprintProgress}
          />
        </>
      )}
    </div>
  );
}
