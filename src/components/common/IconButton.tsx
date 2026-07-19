import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useRipple } from '../../lib/useRipple';
import { RippleLayer } from './RippleLayer';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'glass' | 'ink' | 'plain';
  size?: number;
}

const VARIANTS = {
  glass: 'glass text-ink hover:bg-card shadow-soft',
  ink: 'bg-ink text-onink hover:opacity-90 shadow-soft',
  plain: 'bg-card text-ink hover:bg-surface shadow-soft',
};

export function IconButton({
  children,
  variant = 'glass',
  size = 44,
  className = '',
  onPointerDown,
  ...rest
}: IconButtonProps) {
  const { ripples, onPointerDown: fireRipple } = useRipple();

  return (
    <button
      {...rest}
      onPointerDown={(e) => {
        fireRipple(e);
        onPointerDown?.(e);
      }}
      style={{ width: size, height: size }}
      className={`ripple-host relative inline-flex items-center justify-center rounded-full transition-all duration-150 active:scale-[0.94] ${VARIANTS[variant]} ${className}`}
    >
      <RippleLayer ripples={ripples} />
      {children}
    </button>
  );
}
