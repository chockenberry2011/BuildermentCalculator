export interface WiringBuilding {
  x: number;
  y: number;
  isShared: boolean;
}

export interface WiringBelt {
  beltIndex: number;
  y: number;
  buildings: WiringBuilding[];
  endX: number;
}

export interface WiringMergeZone {
  buildings: WiringBuilding[];
  x: number;
}

export interface WiringLayout {
  width: number;
  height: number;
  belts: WiringBelt[];
  mergeZone: WiringMergeZone | null;
}

/** Compressed row representation when fullPerBelt > 6 */
export interface CompressedRow {
  shown: { x: number; index: number }[];
  totalCount: number;
  ellipsisX: number;
}

const BUILDING_START_X = 36;
const BUILDING_SIZE = 16;
const BUILDING_GAP = 4;
const BELT_SPACING = 28;
const MERGE_GAP = 12;
const COMPRESS_THRESHOLD = 6;

/**
 * Compute SVG coordinates for a belt wiring diagram.
 *
 * @param totalBuildings - Total number of buildings across all belts
 * @param beltsNeeded - Number of belts
 * @param fullPerBelt - Number of fully-dedicated buildings per belt row
 * @param sharedCount - Number of shared buildings (split across belts)
 */
export function computeWiringLayout(
  totalBuildings: number,
  beltsNeeded: number,
  fullPerBelt: number,
  sharedCount: number
): WiringLayout {
  const compressed = fullPerBelt > COMPRESS_THRESHOLD;
  // How many building slots to actually draw per row
  const drawnPerRow = compressed ? 4 : fullPerBelt; // 2 + "..." + last = ~4 visual slots

  const lastBuildingEndX = BUILDING_START_X + drawnPerRow * (BUILDING_SIZE + BUILDING_GAP);
  const mergeZoneStartX = lastBuildingEndX + MERGE_GAP;

  const totalHeight = beltsNeeded * BELT_SPACING;
  const belts: WiringBelt[] = [];

  for (let b = 0; b < beltsNeeded; b++) {
    const y = BELT_SPACING / 2 + b * BELT_SPACING;
    const buildings: WiringBuilding[] = [];

    if (compressed) {
      // Show first 2, then gap (ellipsis area), then last
      for (let i = 0; i < 2; i++) {
        buildings.push({
          x: BUILDING_START_X + i * (BUILDING_SIZE + BUILDING_GAP),
          y: y - BUILDING_SIZE / 2,
          isShared: false,
        });
      }
      // Last building at slot index 3 (leaving slot 2 for ellipsis)
      buildings.push({
        x: BUILDING_START_X + 3 * (BUILDING_SIZE + BUILDING_GAP),
        y: y - BUILDING_SIZE / 2,
        isShared: false,
      });
    } else {
      for (let i = 0; i < fullPerBelt; i++) {
        buildings.push({
          x: BUILDING_START_X + i * (BUILDING_SIZE + BUILDING_GAP),
          y: y - BUILDING_SIZE / 2,
          isShared: false,
        });
      }
    }

    belts.push({
      beltIndex: b,
      y,
      buildings,
      endX: lastBuildingEndX,
    });
  }

  let mergeZone: WiringMergeZone | null = null;
  let width = lastBuildingEndX + 8;

  if (sharedCount > 0) {
    const mergeBuildings: WiringBuilding[] = [];
    const centerY = totalHeight / 2;
    // Stack shared buildings vertically centered
    const totalSharedHeight = sharedCount * (BUILDING_SIZE + BUILDING_GAP) - BUILDING_GAP;
    const startY = centerY - totalSharedHeight / 2;

    for (let i = 0; i < sharedCount; i++) {
      mergeBuildings.push({
        x: mergeZoneStartX + 16, // leave room for bracket
        y: startY + i * (BUILDING_SIZE + BUILDING_GAP),
        isShared: true,
      });
    }

    mergeZone = {
      buildings: mergeBuildings,
      x: mergeZoneStartX,
    };

    width = mergeZoneStartX + 16 + BUILDING_SIZE + 8;
  }

  return {
    width,
    height: totalHeight,
    belts,
    mergeZone,
  };
}

/** Returns compressed row metadata for annotation rendering */
export function getCompressedInfo(fullPerBelt: number): CompressedRow | null {
  if (fullPerBelt <= COMPRESS_THRESHOLD) return null;
  return {
    shown: [
      { x: BUILDING_START_X, index: 0 },
      { x: BUILDING_START_X + (BUILDING_SIZE + BUILDING_GAP), index: 1 },
      { x: BUILDING_START_X + 3 * (BUILDING_SIZE + BUILDING_GAP), index: fullPerBelt - 1 },
    ],
    totalCount: fullPerBelt,
    ellipsisX: BUILDING_START_X + 2 * (BUILDING_SIZE + BUILDING_GAP) + BUILDING_SIZE / 2,
  };
}
