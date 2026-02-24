import { ProductionResult, ProductionNode } from './ProductionCalculator';
import { Rational } from './math/rational';
import { isCleanBeltMultiple, getBeltsNeeded, getBeltUtilization, classifyBeltStatus, BeltStatus } from '../data/belts';

export interface BeltConnection {
  fromItemId: string;
  fromItemName: string;
  toItemId: string;
  toItemName: string;
  throughputPerMinute: Rational;
  beltsNeeded: number;          // Ceiling of throughput / beltSpeed
  isCleanMultiple: boolean;     // True if throughput perfectly fills whole belts
  utilization: number;          // 0-1, how well the belts are filled
  status: BeltStatus;           // multi-belt / near-capacity / ok
}

export interface BeltCalculationResult {
  connections: BeltConnection[];
  totalBelts: number;
  totalConnections: number;

  // Multi-belt and capacity fields
  multiBeltConnections: BeltConnection[];    // Connections needing 2+ belts
  nearCapacityConnections: BeltConnection[]; // Single belt but >80% full
  hasMultiBelt: boolean;
  hasNearCapacity: boolean;
  maxBeltsNeeded: number;

  // Deprecated — kept for optimizer/FractionalSolver backward compat
  cleanConnections: number;
  cleanRatio: number;
  averageUtilization: number;
  problemConnections: BeltConnection[];
}

/**
 * Calculate belt requirements for a production tree.
 * The key insight: we want to find rates where ALL throughputs are clean
 * multiples of belt capacity - no splitters, no mergers, no leaks.
 */
export function calculateBeltRequirements(
  result: ProductionResult,
  beltSpeed: number
): BeltCalculationResult {
  const connections: BeltConnection[] = [];

  // Traverse the production tree and analyze each connection
  function processNode(node: ProductionNode) {
    for (const child of node.children) {
      const throughput = child.ratePerMinute.toNumber();
      const beltsNeeded = getBeltsNeeded(throughput, beltSpeed);
      const isClean = isCleanBeltMultiple(throughput, beltSpeed);
      const utilization = getBeltUtilization(throughput, beltSpeed);

      const status = classifyBeltStatus(throughput, beltSpeed);

      const connection: BeltConnection = {
        fromItemId: child.itemId,
        fromItemName: child.itemName,
        toItemId: node.itemId,
        toItemName: node.itemName,
        throughputPerMinute: child.ratePerMinute,
        beltsNeeded,
        isCleanMultiple: isClean,
        utilization,
        status,
      };

      connections.push(connection);

      // Recurse
      processNode(child);
    }
  }

  processNode(result.root);

  // Calculate summary stats
  const totalBelts = connections.reduce((sum, c) => sum + c.beltsNeeded, 0);
  const totalConnections = connections.length;

  // Multi-belt stats
  const multiBeltConnections = connections
    .filter((c) => c.status === 'multi-belt')
    .sort((a, b) => b.beltsNeeded - a.beltsNeeded); // most belts first
  const nearCapacityConnections = connections
    .filter((c) => c.status === 'near-capacity')
    .sort((a, b) => b.utilization - a.utilization); // fullest first
  const maxBeltsNeeded = connections.reduce((max, c) => Math.max(max, c.beltsNeeded), 0);

  // Deprecated fields — kept for optimizer/FractionalSolver
  const cleanConnections = connections.filter((c) => c.isCleanMultiple).length;
  const cleanRatio = totalConnections > 0 ? cleanConnections / totalConnections : 1;
  const averageUtilization =
    totalConnections > 0
      ? connections.reduce((sum, c) => sum + c.utilization, 0) / totalConnections
      : 1;
  const problemConnections = connections.filter((c) => !c.isCleanMultiple);

  return {
    connections,
    totalBelts,
    totalConnections,
    multiBeltConnections,
    nearCapacityConnections,
    hasMultiBelt: multiBeltConnections.length > 0,
    hasNearCapacity: nearCapacityConnections.length > 0,
    maxBeltsNeeded,
    cleanConnections,
    cleanRatio,
    averageUtilization,
    problemConnections,
  };
}

/**
 * Format belt requirement for display.
 */
export function formatBeltRequirement(connection: BeltConnection): string {
  if (connection.status === 'multi-belt') {
    return `${connection.beltsNeeded} belts`;
  }
  if (connection.status === 'near-capacity') {
    return `${Math.round(connection.utilization * 100)}% belt`;
  }
  return `${connection.beltsNeeded} belt${connection.beltsNeeded > 1 ? 's' : ''}`;
}

/**
 * Check if a production result has all clean belt connections at the given belt speed.
 */
export function hasAllCleanBelts(result: ProductionResult, beltSpeed: number): boolean {
  function checkNode(node: ProductionNode): boolean {
    for (const child of node.children) {
      const throughput = child.ratePerMinute.toNumber();
      if (!isCleanBeltMultiple(throughput, beltSpeed)) {
        return false;
      }
      if (!checkNode(child)) {
        return false;
      }
    }
    return true;
  }

  return checkNode(result.root);
}

/**
 * Calculate belt efficiency for a scaled production.
 * Used by the optimizer to score different scales.
 */
export function calculateBeltEfficiencyForScale(
  result: ProductionResult,
  scale: number,
  beltSpeed: number
): { cleanRatio: number; hasProblems: boolean } {
  let cleanCount = 0;
  let totalCount = 0;

  function processNode(node: ProductionNode) {
    for (const child of node.children) {
      const throughput = child.ratePerMinute.toNumber() * scale;
      if (isCleanBeltMultiple(throughput, beltSpeed)) {
        cleanCount++;
      }
      totalCount++;
      processNode(child);
    }
  }

  processNode(result.root);

  return {
    cleanRatio: totalCount > 0 ? cleanCount / totalCount : 1,
    hasProblems: cleanCount < totalCount,
  };
}
