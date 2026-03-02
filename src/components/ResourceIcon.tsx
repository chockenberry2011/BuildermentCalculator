/**
 * Compact SVG icons for raw resources.
 */

import { EXTRACTOR_COLORS } from './BuildingIcon';
import { getItemColor } from '../data/itemColors';

function IconWoodLog({ color }: { color: string }) {
  return (
    <>
      {/* Log cross-section */}
      <circle cx="8" cy="8" r="5.5" fill={color} />
      <circle cx="8" cy="8" r="3" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" />
      <circle cx="8" cy="8" r="1" fill="white" opacity="0.3" />
    </>
  );
}

function IconStone({ color }: { color: string }) {
  return (
    <path
      d="M4 11L2 7L5 3L10 2L14 5L13 10L9 13Z"
      fill={color}
    />
  );
}

function IconIronOre({ color }: { color: string }) {
  return (
    <>
      <rect x="3" y="3" width="10" height="10" rx="1.5" fill={color} />
      <text x="8" y="10.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" opacity="0.7">Fe</text>
    </>
  );
}

function IconCopperOre({ color }: { color: string }) {
  return (
    <>
      <rect x="3" y="3" width="10" height="10" rx="1.5" fill={color} />
      <text x="8" y="10.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" opacity="0.7">Cu</text>
    </>
  );
}

function IconCoal({ color }: { color: string }) {
  return (
    <>
      <path d="M5 12L3 7L5 3L11 3L13 7L11 12Z" fill={color} />
      <path d="M6 5L8 4L10 5L10 8L8 9L6 8Z" fill="white" opacity="0.15" />
    </>
  );
}

function IconWolframite({ color }: { color: string }) {
  return (
    <>
      <rect x="3" y="3" width="10" height="10" rx="1.5" fill={color} />
      <text x="8" y="10.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" opacity="0.7">W</text>
    </>
  );
}

function IconGoldOre({ color }: { color: string }) {
  return (
    <>
      <rect x="3" y="3" width="10" height="10" rx="1.5" fill={color} />
      <text x="8" y="10.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" opacity="0.85">Au</text>
    </>
  );
}

const ICON_COMPONENTS: Record<string, React.FC<{ color: string }>> = {
  wood_log: IconWoodLog,
  stone: IconStone,
  iron_ore: IconIronOre,
  copper_ore: IconCopperOre,
  coal: IconCoal,
  wolframite: IconWolframite,
  gold_ore: IconGoldOre,
};

interface ResourceIconProps {
  resourceId: string;
  className?: string;
}

export function ResourceIcon({ resourceId, className = '' }: ResourceIconProps) {
  const IconComponent = ICON_COMPONENTS[resourceId];
  if (!IconComponent) return null;

  const color = EXTRACTOR_COLORS[resourceId] ?? getItemColor(resourceId);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={16}
      height={16}
      className={`inline-block flex-shrink-0 ${className}`}
    >
      <IconComponent color={color} />
    </svg>
  );
}
