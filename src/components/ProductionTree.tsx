import { useState, useEffect } from 'react';
import { ProductionNode } from '../core/ProductionCalculator';
import { BUILDINGS } from '../data/buildings';
import { getItemColor } from '../data/itemColors';
import { useStore, type BlueprintProgressState } from '../store/useStore';
import { useDark } from '../hooks/useDark';
import { BeltCalculationResult } from '../core/BeltCalculator';
import { BuildingIcon } from './BuildingIcon';
import { BeltBadge } from './BeltBadge';
import { EditableBuildingCount } from './EditableBuildingCount';
import { SplitBadge } from './SplitBadge';
import { LevelBadge } from './LevelBadge';
import { ProgressCheckbox } from './blueprint/ProgressCheckbox';

interface TreeNodeProps {
  node: ProductionNode;
  depth: number;
  isDark: boolean;
  beltResult: BeltCalculationResult | null;
  setRateFromItemBuildingCount: (itemId: string, count: number) => void;
  constraintSource: { type: string; itemId?: string };
  blueprintProgress: Map<string, BlueprintProgressState>;
  setBlueprintProgressState: (nodeKey: string, state: BlueprintProgressState | null) => void;
  isSmallScreen: boolean;
}

function useNodeProgress(node: ProductionNode, blueprintProgress: Map<string, BlueprintProgressState>): BlueprintProgressState | false {
  const baseState = blueprintProgress.get(node.itemId);
  const splitPrefix = `${node.itemId}_for_`;
  const splitKeys = [...blueprintProgress.keys()].filter(k => k.startsWith(splitPrefix));
  const allKeys = baseState ? [node.itemId, ...splitKeys] : splitKeys;

  if (allKeys.length === 0) return false;

  const allCompleted = allKeys.every(k => blueprintProgress.get(k) === 'completed');
  if (allCompleted) return 'completed';

  return 'in_progress';
}

function cycleProgress(
  node: ProductionNode,
  nodeProgressState: BlueprintProgressState | false,
  blueprintProgress: Map<string, BlueprintProgressState>,
  setBlueprintProgressState: (nodeKey: string, state: BlueprintProgressState | null) => void,
) {
  const nextState: BlueprintProgressState | null =
    !nodeProgressState ? 'in_progress' :
    nodeProgressState === 'in_progress' ? 'completed' :
    null;

  const splitPrefix = `${node.itemId}_for_`;
  const splitKeys = [...blueprintProgress.keys()].filter(k => k.startsWith(splitPrefix));
  for (const k of splitKeys) {
    setBlueprintProgressState(k, nextState);
  }
  setBlueprintProgressState(node.itemId, nextState);
}

function MobileTreeNode({ node, depth, isDark, beltResult, setRateFromItemBuildingCount, constraintSource, blueprintProgress, setBlueprintProgressState }: Omit<TreeNodeProps, 'isSmallScreen' | 'isLastChild' | 'parentHasMore'>) {
  const indent = Math.min(depth * 12, 48);
  const accentColor = getItemColor(node.itemId);

  const buildingInfo = node.building;
  const buildingName = buildingInfo
    ? BUILDINGS[buildingInfo.buildingType]?.name ?? buildingInfo.buildingType
    : '';

  const rate = node.ratePerMinute.toNumber();
  const isConstraint = constraintSource.type === 'itemBuilding' && constraintSource.itemId === node.itemId;
  const nodeProgressState = useNodeProgress(node, blueprintProgress);

  const beltConnection = beltResult
    ? beltResult.connections.find((c) => c.fromItemId === node.itemId)
    : null;

  const progressBg = nodeProgressState === 'completed'
    ? isDark ? 'bg-green-900/40' : 'bg-green-50'
    : nodeProgressState === 'in_progress'
      ? isDark ? 'bg-amber-900/30' : 'bg-amber-50/60'
      : '';

  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div>
      <div
        className={`rounded-md mb-1 ${progressBg}`}
        style={{
          marginLeft: `${indent}px`,
          borderLeft: `3px solid ${accentColor}`,
          opacity: nodeProgressState === 'completed' ? 0.6 : 1,
        }}
      >
        <div className="px-2.5 py-1.5">
          {/* Row 1: name + rate + progress checkbox */}
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold text-sm truncate flex-1 min-w-0 ${textColor}`}>
              {node.itemName}
            </span>
            <span className={`text-xs tabular-nums shrink-0 ${subtextColor}`}>
              {rate.toFixed(2)}/min
            </span>
            <button
              className="shrink-0 -mr-0.5"
              onClick={(e) => {
                e.stopPropagation();
                cycleProgress(node, nodeProgressState, blueprintProgress, setBlueprintProgressState);
              }}
              title={nodeProgressState === 'completed' ? 'Reset progress' : nodeProgressState === 'in_progress' ? 'Mark as built' : 'Mark as in progress'}
            >
              <ProgressCheckbox progressState={nodeProgressState} isDark={isDark} size={18} />
            </button>
          </div>

          {/* Row 2: building info + badges */}
          {buildingInfo && (
            <div className="flex items-center gap-1.5 mt-1">
              <EditableBuildingCount
                count={buildingInfo.count}
                isConstraint={isConstraint}
                onSetCount={(newCount) => setRateFromItemBuildingCount(node.itemId, newCount)}
                isDark={isDark}
              />
              <BuildingIcon buildingType={buildingInfo.buildingType} itemId={node.itemId} />
              <span className={`text-xs ${subtextColor} truncate`}>
                {buildingName}
                {buildingInfo.level > 1 && ` Lv${buildingInfo.level}`}
              </span>

              <div className="flex-1" />

              {/* Badges — right-aligned */}
              <div className="flex items-center gap-1 shrink-0">
                {beltConnection && (
                  <BeltBadge
                    beltConnection={beltConnection}
                    buildingCount={buildingInfo?.count}
                    isDark={isDark}
                  />
                )}
                {!buildingInfo.count.isInteger() && depth > 0 && (() => {
                  const hasUpstreamFraction = node.children.some(
                    child => child.building && !child.building.count.isInteger()
                  );
                  return <SplitBadge count={buildingInfo.count} isDark={isDark} autoRegulated={hasUpstreamFraction} />;
                })()}
                {buildingInfo.level < buildingInfo.configuredLevel && (
                  <LevelBadge building={buildingInfo} isDark={isDark} />
                )}
              </div>
            </div>
          )}

          {/* Raw resource label */}
          {node.isRaw && !buildingInfo && (
            <div className={`text-xs ${subtextColor} italic mt-0.5`}>Raw resource</div>
          )}
        </div>
      </div>

      {/* Children */}
      {node.children.map((child, i) => (
        <MobileTreeNode
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

function TreeNode({ node, depth, isDark, beltResult, setRateFromItemBuildingCount, constraintSource, blueprintProgress, setBlueprintProgressState, isSmallScreen }: TreeNodeProps) {
  const nodeProgressState = useNodeProgress(node, blueprintProgress);

  if (isSmallScreen) {
    return (
      <MobileTreeNode
        node={node}
        depth={depth}
        isDark={isDark}
        beltResult={beltResult}
        setRateFromItemBuildingCount={setRateFromItemBuildingCount}
        constraintSource={constraintSource}
        blueprintProgress={blueprintProgress}
        setBlueprintProgressState={setBlueprintProgressState}
      />
    );
  }

  const accentColor = getItemColor(node.itemId);

  const buildingInfo = node.building;
  const buildingName = buildingInfo
    ? BUILDINGS[buildingInfo.buildingType]?.name ?? buildingInfo.buildingType
    : '';

  const rate = node.ratePerMinute.toNumber();
  const isConstraint = constraintSource.type === 'itemBuilding' && constraintSource.itemId === node.itemId;

  const beltConnection = beltResult
    ? beltResult.connections.find((c) => c.fromItemId === node.itemId)
    : null;

  const connectorColor = isDark ? 'border-gray-600' : 'border-gray-300';

  return (
    <div className="text-sm relative">
      {/* Vertical indentation guides */}
      {depth > 0 && (
        <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 0 }}>
          {Array.from({ length: depth }, (_, d) => (
            <div
              key={d}
              className={`absolute top-0 bottom-0 border-l ${connectorColor}`}
              style={{
                left: `${d * 16 + 8}px`,
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`flex flex-nowrap items-center py-1.5 rounded-md px-2 cursor-pointer transition-colors ${
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
                : 'hover:bg-gray-50'
        }`}
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          opacity: nodeProgressState === 'completed' ? 0.6 : 1,
          borderLeft: depth > 0 ? `3px solid ${accentColor}` : undefined,
        }}
        onClick={() => cycleProgress(node, nodeProgressState, blueprintProgress, setBlueprintProgressState)}
      >
        {/* CSS connector stubs for tree structure */}
        {depth > 0 && (
          <div className="relative flex items-center mr-2" style={{ width: '12px', height: '100%' }}>
            <div className={`absolute border-t-2 ${connectorColor}`} style={{ width: '12px', top: '50%' }} />
          </div>
        )}

        {/* Item name with colored pill background */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="font-medium truncate px-1.5 py-0.5 rounded-md text-sm"
            style={{
              color: accentColor,
              backgroundColor: accentColor + '15',
            }}
          >
            {node.itemName}
          </span>
          <span className={`flex-shrink-0 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {rate.toFixed(2)}/min
          </span>
        </div>

        {/* Building info */}
        {buildingInfo && (
          <div className="flex items-center gap-1.5 ml-3">
            <EditableBuildingCount
              count={buildingInfo.count}
              isConstraint={isConstraint}
              onSetCount={(newCount) => setRateFromItemBuildingCount(node.itemId, newCount)}
              isDark={isDark}
            />
            <BuildingIcon buildingType={buildingInfo.buildingType} itemId={node.itemId} />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {buildingName}
              {buildingInfo.level > 1 && (
                <span className={`ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
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
          isSmallScreen={false}
        />
      ))}
    </div>
  );
}

export function ProductionTree() {
  const productionResult = useStore((s) => s.productionResult);
  const beltResult = useStore((s) => s.beltResult);
  const targetRate = useStore((s) => s.targetRate);
  const setRateFromItemBuildingCount = useStore((s) => s.setRateFromItemBuildingCount);
  const constraintSource = useStore((s) => s.constraintSource);
  const blueprintProgress = useStore((s) => s.blueprintProgress);
  const setBlueprintProgressState = useStore((s) => s.setBlueprintProgressState);
  const isDark = useDark();

  const [isSmallScreen, setIsSmallScreen] = useState(
    () => window.matchMedia('(max-width: 639px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!productionResult) {
    return (
      <div className={`italic p-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Select an item to see production requirements
      </div>
    );
  }

  const isMultiRoot = productionResult.root.itemId === '__multi_root__';

  const renderNode = (node: ProductionNode, depth: number) => (
    <TreeNode
      node={node}
      depth={depth}
      isDark={isDark}
      beltResult={beltResult}
      setRateFromItemBuildingCount={setRateFromItemBuildingCount}
      constraintSource={constraintSource}
      blueprintProgress={blueprintProgress}
      setBlueprintProgressState={setBlueprintProgressState}
      isSmallScreen={isSmallScreen}
    />
  );

  // Root item header card styling
  const rootHeaderClass = isDark
    ? 'bg-gray-700/50 border border-gray-600/50'
    : 'bg-gray-50 border border-gray-200';

  return (
    <div className={isSmallScreen ? 'overflow-x-hidden' : 'overflow-x-auto'}>
      {isMultiRoot ? (
        productionResult.root.children.map((child, i) => {
          const itemColor = getItemColor(child.itemId);
          return (
            <div key={`${child.itemId}-${i}`}>
              <div
                className={`mb-3 rounded-lg overflow-hidden ${rootHeaderClass} ${i > 0 ? 'mt-5' : ''}`}
              >
                <div className="h-1" style={{ backgroundColor: itemColor }} />
                <div className="px-3 py-2">
                  <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {child.itemName}
                  </span>
                  <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    @ {child.ratePerMinute.toNumber().toFixed(2)}/min
                  </span>
                </div>
              </div>
              {renderNode(child, 0)}
            </div>
          );
        })
      ) : (
        <>
          <div className={`mb-3 rounded-lg overflow-hidden ${rootHeaderClass}`}>
            <div className="h-1" style={{ backgroundColor: getItemColor(productionResult.root.itemId) }} />
            <div className="px-3 py-2">
              <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {productionResult.root.itemName}
              </span>
              <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                @ {targetRate.toFixed(2)}/min
              </span>
            </div>
          </div>
          {renderNode(productionResult.root, 0)}
        </>
      )}
    </div>
  );
}
