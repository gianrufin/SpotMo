import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useRipple } from '../../lib/useRipple';
import { RippleLayer } from './RippleLayer';

interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: 'default' | 'small';
}

/** Material 3 FAB: rounded-square ("squircle") shape, primary-container
 * fill, elevated, with ripple — used for the map's single floating action. */
export function Fab({ children, size = 'default', className = '', onPointerDown, ...rest }: FabProps) {
  const { ripples, onPointerDown: fireRipple } = useRipple();
  const dims = size === 'small' ? 'h-10 w-10 rounded-xl' : 'h-14 w-14 rounded-2xl';

  return (
    <button
      {...rest}
      onPointerDown={(e) => {
        fireRipple(e);
        onPointerDown?.(e);
      }}
      className={`ripple-host relative flex items-center justify-center bg-brandsoft text-brandsoftfg shadow-fab transition active:scale-90 ${dims} ${className}`}
    >
      <RippleLayer ripples={ripples} />
      {children}
    </button>
  );
}
