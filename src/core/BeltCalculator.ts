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

  return {
    connections,
    totalBelts,
    totalConnections,
    multiBeltConnections,
    nearCapacityConnections,
    hasMultiBelt: multiBeltConnections.length > 0,
    hasNearCapacity: nearCapacityConnections.length > 0,
    maxBeltsNeeded,
  };
}
