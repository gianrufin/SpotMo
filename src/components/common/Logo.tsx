import { MapPin } from 'lucide-react';

interface LogoProps {
  /** overall font size in px for the wordmark */
  size?: number;
  variant?: 'default' | 'light';
  className?: string;
}

/**
 * SpotMo wordmark — "Spot" in ink + "Mo" in emerald, with the trailing "o"
 * rendered as a location pin. Uses Instrument Serif per brand guidelines.
 */
export function Logo({ size = 34, variant = 'default', className = '' }: LogoProps) {
  // theme-aware ink; `light` forces white (for use over images / dark heroes)
  const inkColor = variant === 'light' ? '#FFFFFF' : 'rgb(var(--c-fg))';
  return (
    <span
      className={`inline-flex items-end font-serif leading-none ${className}`}
      style={{ fontSize: size }}
      aria-label="SpotMo"
    >
      <span style={{ color: inkColor }}>Spot</span>
      <span style={{ color: '#10B981' }}>M</span>
      <MapPin
        size={size * 0.66}
        strokeWidth={1.5}
        className="-ml-[0.04em] mb-[0.06em] self-end"
        style={{ color: '#10B981', fill: '#10B981' }}
      />
    </span>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-2xl bg-card shadow-soft"
      style={{ width: size, height: size }}
    >
      <MapPin
        size={size * 0.56}
        strokeWidth={2.4}
        style={{ color: '#10B981', fill: '#10B981' }}
        className="text-brand"
      />
    </span>
  );
}
