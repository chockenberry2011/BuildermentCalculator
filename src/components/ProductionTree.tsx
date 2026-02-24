import { ProductionNode } from '../core/ProductionCalculator';
import { BUILDINGS } from '../data/buildings';
import { useStore } from '../store/useStore';
import { Rational } from '../core/math/rational';
import { BeltCalculationResult, formatBeltRequirement } from '../core/BeltCalculator';

interface TreeNodeProps {
  node: ProductionNode;
  depth: number;
  isDark: boolean;
  showBeltInfo: boolean;
  beltResult: BeltCalculationResult | null;
}

function formatCount(count: Rational): { text: string; isInteger: boolean } {
  const value = count.toNumber();
  const isInteger = count.isInteger() || Math.abs(value - Math.round(value)) < 0.001;

  if (isInteger) {
    return { text: Math.round(value).toString(), isInteger: true };
  }

  return { text: value.toFixed(2), isInteger: false };
}

function TreeNode({ node, depth, isDark, showBeltInfo, beltResult }: TreeNodeProps) {
  const indent = depth * 16;

  const buildingInfo = node.building;
  const buildingName = buildingInfo
    ? BUILDINGS[buildingInfo.buildingType]?.name ?? buildingInfo.buildingType
    : '';

  const count = buildingInfo ? formatCount(buildingInfo.count) : null;
  const rate = node.ratePerMinute.toNumber();

  // Find belt connection for this node (from this item to its parent)
  const beltConnection = showBeltInfo && beltResult
    ? beltResult.connections.find((c) => c.fromItemId === node.itemId)
    : null;

  return (
    <div className="font-mono text-xs sm:text-sm">
      <div
        className={`flex items-center gap-2 py-1 rounded px-2 ${
          isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {/* Connector line */}
        {depth > 0 && (
          <span className={isDark ? 'text-gray-600 mr-1' : 'text-gray-400 mr-1'}>
            {depth === 1 ? '├──' : '└──'}
          </span>
        )}

        {/* Item name and rate */}
        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {node.itemName}
        </span>
        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
          ({rate.toFixed(2)}/min)
        </span>

        {/* Building info */}
        {buildingInfo && count && (
          <>
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>-</span>
            <span
              className={`font-semibold ${
                count.isInteger
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}
            >
              {count.text}
            </span>
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {buildingName}
              {buildingInfo.level > 1 && (
                <span className={`text-xs ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Lv{buildingInfo.level}
                </span>
              )}
            </span>
            {count.isInteger && (
              <span
                className="text-xs px-1 py-0.5 rounded bg-green-800 text-green-300"
                title="Exact building count - no fractions needed"
              >
                INT
              </span>
            )}
          </>
        )}

        {/* Belt info — only show for bottleneck or near-capacity */}
        {beltConnection && beltConnection.status !== 'ok' && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              beltConnection.status === 'multi-belt'
                ? 'bg-blue-900 text-blue-300'
                : 'bg-yellow-900 text-yellow-300'
            }`}
            title={`${beltConnection.throughputPerMinute.toNumber().toFixed(1)}/min throughput, ${Math.round(beltConnection.utilization * 100)}% belt utilization`}
          >
            ← {formatBeltRequirement(beltConnection)}
          </span>
        )}
      </div>

      {/* Children */}
      {node.children.map((child, i) => (
        <TreeNode
          key={`${child.itemId}-${i}`}
          node={child}
          depth={depth + 1}
          isDark={isDark}
          showBeltInfo={showBeltInfo}
          beltResult={beltResult}
        />
      ))}
    </div>
  );
}

export function ProductionTree() {
  const productionResult = useStore((s) => s.productionResult);
  const beltResult = useStore((s) => s.beltResult);
  const showBeltInfo = useStore((s) => s.showBeltInfo);
  const targetRate = useStore((s) => s.targetRate);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  if (!productionResult) {
    return (
      <div className={`italic p-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Select an item to see production requirements
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 sm:p-4 overflow-auto max-h-[60vh] sm:max-h-[500px] ${
      isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'
    }`}>
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
        showBeltInfo={showBeltInfo}
        beltResult={beltResult}
      />
    </div>
  );
}
