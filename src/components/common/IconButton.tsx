import type { ButtonHTMLAttributes, ReactNode } from 'react';

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
