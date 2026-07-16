import type { ReactNode } from 'react';

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Light, fast filter pill. Active = ink fill, inactive = glass. */
export function Chip({ active, onClick, icon, children, className = '' }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] transition-all duration-150 active:scale-[0.97] ${
        active
          ? 'bg-ink text-white shadow-soft'
          : 'glass text-ink hover:bg-white/90'
      } ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
