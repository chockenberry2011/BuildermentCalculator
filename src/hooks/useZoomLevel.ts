import { useStore } from '@xyflow/react';

export type ZoomLevel = 'mini' | 'compact' | 'full';

const MINI_THRESHOLD = 0.35;
const COMPACT_THRESHOLD = 0.7;

function zoomToLevel(zoom: number): ZoomLevel {
  if (zoom < MINI_THRESHOLD) return 'mini';
  if (zoom < COMPACT_THRESHOLD) return 'compact';
  return 'full';
}

/**
 * Discretized zoom hook — only triggers re-render when the zoom level
 * crosses a threshold ('mini' | 'compact' | 'full'), not on every zoom tick.
 */
export function useZoomLevel(): ZoomLevel {
  return useStore((s) => zoomToLevel(s.transform[2]));
}
