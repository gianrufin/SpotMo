import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'brand' | 'soft' | 'ghost';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  // ink black pill — the brand's primary CTA
  primary: 'bg-ink text-onink hover:opacity-90 active:scale-[0.98] shadow-soft',
  brand: 'bg-brand text-white hover:bg-brand-600 active:scale-[0.98] shadow-soft',
  soft: 'bg-surface text-ink hover:bg-hairline active:scale-[0.98]',
  ghost: 'bg-transparent text-ink hover:bg-surface active:scale-[0.98]',
};

export function PrimaryButton({
  variant = 'primary',
  full,
  icon,
  children,
  className = '',
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-normal transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none ${
        VARIANTS[variant]
      } ${full ? 'w-full' : ''} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
