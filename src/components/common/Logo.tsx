interface LogoProps {
  /** overall font size in px for the wordmark */
  size?: number;
  variant?: 'default' | 'light';
  className?: string;
}

/** SpotMo wordmark — plain text, Inter bold, no icon. */
export function Logo({ size = 34, variant = 'default', className = '' }: LogoProps) {
  // theme-aware ink; `light` forces white (for use over images / dark heroes)
  const inkColor = variant === 'light' ? '#FFFFFF' : 'rgb(var(--c-fg))';
  return (
    <span
      className={`inline-block font-sans font-bold leading-none ${className}`}
      style={{ fontSize: size, color: inkColor }}
    >
      SpotMo
    </span>
  );
}

/**
 * The SpotMo app icon mark — "tokyo neon": an open location-pin outline that
 * breaks into a navigation arrow (same "go to it" idea as before, redrawn as
 * a glowing outline), with a small accent dot where the pin's lens would be.
 * Matches the installed app/favicon icon exactly (see public/favicon.svg).
 */
export function AppIconGlyph({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M35 16.5C31.5 13 26.5 13 23 16.5C19.5 20 19.5 25.5 23 29.5C25.5 32.3 29 36.5 32 40.5C35 36.5 38.5 32.3 41 29.5C41.7 28.7 42.3 27.9 42.8 27.1"
        stroke="#2EF6F6"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 15L47 13.5L45.5 25.5"
        stroke="#2EF6F6"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M47 13.5L32 40.5L26.5 34.5"
        stroke="#2EF6F6"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29" cy="24" r="4.6" fill="#E63462" />
    </svg>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-2xl bg-card shadow-soft"
      style={{ width: size, height: size }}
    >
      <AppIconGlyph size={size * 0.72} />
    </span>
  );
}
