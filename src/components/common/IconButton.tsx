import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'glass' | 'ink' | 'plain';
  size?: number;
}

const VARIANTS = {
  glass: 'glass text-ink hover:bg-white/90 shadow-soft',
  ink: 'bg-ink text-white hover:bg-black shadow-soft',
  plain: 'bg-white text-ink hover:bg-surface shadow-soft',
};

export function IconButton({
  children,
  variant = 'glass',
  size = 44,
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-full transition-all duration-150 active:scale-[0.94] ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
