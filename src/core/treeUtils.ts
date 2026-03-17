import { ProductionResult } from './ProductionCalculator';

/**
 * Collect all throughputs at scale=1 from the production tree.
 */
export function collectThroughputs(result: ProductionResult): number[] {
  const throughputs: number[] = [];

  function processNode(node: typeof result.root) {
    for (const child of node.children) {
      throughputs.push(child.ratePerMinute.toNumber());
      processNode(child);
    }
  }

  processNode(result.root);
  return throughputs;
}
