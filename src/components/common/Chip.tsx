import type { ReactNode } from 'react';
import { useRipple } from '../../lib/useRipple';
import { RippleLayer } from './RippleLayer';

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Material filter chip. Active = secondary-container fill, inactive = glass. */
export function Chip({ active, onClick, icon, children, className = '' }: ChipProps) {
  const { ripples, onPointerDown } = useRipple();

  return (
    <button
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={`ripple-host relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] transition-all duration-150 active:scale-[0.97] ${
        active
          ? 'bg-secondarysoft text-secondarysoftfg shadow-soft'
          : 'glass text-ink hover:bg-card'
      } ${className}`}
    >
      <RippleLayer ripples={ripples} />
      {icon}
      {children}
    </button>
  );
}
