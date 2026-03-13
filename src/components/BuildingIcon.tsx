import { BuildingType, BUILDINGS } from '../data/buildings';

export const BUILDING_COLORS: Record<BuildingType, string> = {
  extractor: '#3B82F6',        // blue
  workshop: '#6B7280',         // gray
  furnace: '#F97316',          // orange
  machine_shop: '#64748B',     // slate
  industrial_factory: '#A855F7', // purple
  manufacturer: '#6366F1',     // indigo
  forge: '#EF4444',            // red
  earth_teleporter: '#14B8A6', // teal
};

/** Per-resource extractor colors matching in-game visuals */
export const EXTRACTOR_COLORS: Record<string, string> = {
  wood_log: '#4AA84B',        // green
  stone: '#9CA3AF',           // grey/silver
  iron_ore: '#60A5FA',        // light blue
  copper_ore: '#E07830',      // orange
  coal: '#374151',            // black/dark
  wolframite: '#9B2D5B',      // burgundy
  gold_ore: '#D4A017',        // gold
  uranium: '#86EFAC',         // light green
};

interface BuildingIconProps {
  buildingType: BuildingType;
  itemId?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES = { sm: 16, md: 20 } as const;

function IconExtractor({ color }: { color: string }) {
  return (
    <>
      {/* Pickaxe */}
      <line x1="3" y1="3" x2="13" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M2 5L5 2L8 5L5 8Z" fill={color} />
      <line x1="10" y1="10" x2="14" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function IconWorkshop({ color }: { color: string }) {
  return (
    <>
      {/* Wrench */}
      <path
        d="M10 2C8.3 2 6.9 3.2 6.6 4.8L3 8.4L4.6 10L8.2 6.4C8.7 6.5 9.3 6.5 9.8 6.4L12 8.6L13.4 7.2L11.2 5C11.5 4.1 11.3 3 10.6 2.3C10.4 2.1 10.2 2 10 2Z"
        fill={color}
      />
      <line x1="3" y1="8.5" x2="7.5" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function IconFurnace({ color }: { color: string }) {
  return (
    <>
      {/* Flame */}
      <path
        d="M8 1.5C8 1.5 4 6 4 9.5C4 12 5.8 14 8 14C10.2 14 12 12 12 9.5C12 6 8 1.5 8 1.5Z"
        fill={color}
        opacity="0.85"
      />
      <path
        d="M8 7C8 7 6 9 6 10.5C6 11.6 6.9 12.5 8 12.5C9.1 12.5 10 11.6 10 10.5C10 9 8 7 8 7Z"
        fill="white"
        opacity="0.4"
      />
    </>
  );
}

function IconMachineShop({ color }: { color: string }) {
  return (
    <>
      {/* Single gear */}
      <circle cx="8" cy="8" r="3" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1" fill={color} />
      {/* Teeth */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 8 + 4 * Math.cos(rad);
        const y1 = 8 + 4 * Math.sin(rad);
        const x2 = 8 + 5.5 * Math.cos(rad);
        const y2 = 8 + 5.5 * Math.sin(rad);
        return (
          <line
            key={angle}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth="2" strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

function IconIndustrialFactory({ color }: { color: string }) {
  return (
    <>
      {/* Factory body */}
      <rect x="2" y="7" width="12" height="7" rx="1" fill={color} />
      {/* Smokestack */}
      <rect x="3.5" y="3" width="2.5" height="4" fill={color} />
      {/* Smoke */}
      <circle cx="4.75" cy="2" r="1" fill={color} opacity="0.5" />
      {/* Windows */}
      <rect x="5" y="9" width="2" height="2" rx="0.3" fill="white" opacity="0.4" />
      <rect x="9" y="9" width="2" height="2" rx="0.3" fill="white" opacity="0.4" />
      {/* Roof line */}
      <path d="M8 4L14 7H8Z" fill={color} opacity="0.7" />
    </>
  );
}

function IconManufacturer({ color }: { color: string }) {
  return (
    <>
      {/* Gear 1 */}
      <circle cx="5.5" cy="6" r="2" fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx="5.5" cy="6" r="0.7" fill={color} />
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 5.5 + 2.8 * Math.cos(rad);
        const y1 = 6 + 2.8 * Math.sin(rad);
        const x2 = 5.5 + 3.8 * Math.cos(rad);
        const y2 = 6 + 3.8 * Math.sin(rad);
        return <line key={`a${angle}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" strokeLinecap="round" />;
      })}
      {/* Gear 2 */}
      <circle cx="11" cy="10" r="2" fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx="11" cy="10" r="0.7" fill={color} />
      {[30, 90, 150, 210, 270, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 11 + 2.8 * Math.cos(rad);
        const y1 = 10 + 2.8 * Math.sin(rad);
        const x2 = 11 + 3.8 * Math.cos(rad);
        const y2 = 10 + 3.8 * Math.sin(rad);
        return <line key={`b${angle}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" strokeLinecap="round" />;
      })}
    </>
  );
}

function IconForge({ color }: { color: string }) {
  return (
    <>
      {/* Anvil */}
      <path
        d="M3 8H13L12 6H10V4H6V6H4L3 8Z"
        fill={color}
      />
      <rect x="2" y="8" width="12" height="2" rx="0.5" fill={color} />
      <rect x="4" y="10" width="8" height="1.5" rx="0.5" fill={color} />
      {/* Base */}
      <rect x="3" y="11.5" width="3" height="1.5" rx="0.3" fill={color} />
      <rect x="10" y="11.5" width="3" height="1.5" rx="0.3" fill={color} />
    </>
  );
}

function IconEarthTeleporter({ color }: { color: string }) {
  return (
    <>
      {/* Outer ring */}
      <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.5" />
      {/* Inner ring */}
      <circle cx="8" cy="8" r="3" fill="none" stroke={color} strokeWidth="1.2" />
      {/* Center dot */}
      <circle cx="8" cy="8" r="1" fill={color} />
      {/* Portal arrows - up and down */}
      <path d="M8 1L9.5 3.5H6.5Z" fill={color} />
      <path d="M8 15L6.5 12.5H9.5Z" fill={color} />
      {/* Portal arrows - left and right */}
      <path d="M1 8L3.5 6.5V9.5Z" fill={color} />
      <path d="M15 8L12.5 9.5V6.5Z" fill={color} />
    </>
  );
}

const ICON_COMPONENTS: Record<BuildingType, React.FC<{ color: string }>> = {
  extractor: IconExtractor,
  workshop: IconWorkshop,
  furnace: IconFurnace,
  machine_shop: IconMachineShop,
  industrial_factory: IconIndustrialFactory,
  manufacturer: IconManufacturer,
  forge: IconForge,
  earth_teleporter: IconEarthTeleporter,
};

/**
 * Renders a building icon shape directly inside an existing SVG element.
 * Used by WiringDiagram to embed icons in building rectangles.
 */
export function BuildingIconSvg({ buildingType, x, y, size }: { buildingType: BuildingType; x: number; y: number; size: number }) {
  const IconComponent = ICON_COMPONENTS[buildingType];
  if (!IconComponent) return null;
  const scale = size / 16;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <IconComponent color="rgba(255,255,255,0.85)" />
    </g>
  );
}

export function BuildingIcon({ buildingType, itemId, size = 'sm', className = '' }: BuildingIconProps) {
  const color = (buildingType === 'extractor' && itemId && EXTRACTOR_COLORS[itemId])
    ? EXTRACTOR_COLORS[itemId]
    : BUILDING_COLORS[buildingType] ?? '#6B7280';
  const name = BUILDINGS[buildingType]?.name ?? buildingType;
  const px = SIZES[size];
  const IconComponent = ICON_COMPONENTS[buildingType];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={px}
      height={px}
      className={`inline-block flex-shrink-0 ${className}`}
      role="img"
      aria-label={name}
    >
      <title>{name}</title>
      {IconComponent && <IconComponent color={color} />}
    </svg>
  );
}
