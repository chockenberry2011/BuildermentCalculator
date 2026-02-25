interface BeltIconProps {
  color?: string;
  size?: number;
  className?: string;
}

export function BeltIcon({ color = 'currentColor', size = 12, className = '' }: BeltIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 ${className}`}
      role="img"
      aria-label="belt"
    >
      <title>belt</title>
      {/* Conveyor loop */}
      <rect x="1" y="5" width="14" height="6" rx="3" fill="none" stroke={color} strokeWidth="1.5" />
      {/* Rollers */}
      <circle cx="4" cy="8" r="1.5" fill={color} opacity="0.5" />
      <circle cx="12" cy="8" r="1.5" fill={color} opacity="0.5" />
      {/* Direction arrow */}
      <path d="M7 6.5L9.5 8L7 9.5Z" fill={color} />
    </svg>
  );
}
