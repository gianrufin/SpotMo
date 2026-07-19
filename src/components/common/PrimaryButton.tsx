import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useRipple } from '../../lib/useRipple';
import { RippleLayer } from './RippleLayer';

type Variant = 'primary' | 'brand' | 'soft' | 'ghost';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

// Material 3 button types: primary/brand -> filled, soft -> tonal, ghost -> text.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-onbrand hover:opacity-90 active:scale-[0.98] shadow-soft',
  brand: 'bg-brand text-onbrand hover:opacity-90 active:scale-[0.98] shadow-soft',
  soft: 'bg-brandsoft text-brandsoftfg hover:opacity-90 active:scale-[0.98]',
  ghost: 'bg-transparent text-ink hover:bg-surface active:scale-[0.98]',
};

export function PrimaryButton({
  variant = 'primary',
  full,
  icon,
  children,
  className = '',
  onPointerDown,
  ...rest
}: PrimaryButtonProps) {
  const { ripples, onPointerDown: fireRipple } = useRipple();

  return (
    <button
      {...rest}
      onPointerDown={(e) => {
        fireRipple(e);
        onPointerDown?.(e);
      }}
      className={`ripple-host relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-normal transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none ${
        VARIANTS[variant]
      } ${full ? 'w-full' : ''} ${className}`}
    >
      <RippleLayer ripples={ripples} />
      {icon}
      {children}
    </button>
  );
}
