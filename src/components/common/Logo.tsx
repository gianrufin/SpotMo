interface LogoProps {
  /** overall font size in px for the wordmark */
  size?: number;
  variant?: 'default' | 'light';
  className?: string;
}

/** SpotMo wordmark — plain text, Inter 300, no icon. */
export function Logo({ size = 34, variant = 'default', className = '' }: LogoProps) {
  // theme-aware ink; `light` forces white (for use over images / dark heroes)
  const inkColor = variant === 'light' ? '#FFFFFF' : 'rgb(var(--c-fg))';
  return (
    <span
      className={`inline-block font-sans font-light leading-none ${className}`}
      style={{ fontSize: size, color: inkColor }}
    >
      SpotMo
    </span>
  );
}

/**
 * The SpotMo app icon mark — a location pin paired with the same navigation
 * arrow used for "Go to it" elsewhere in the app. Matches the installed
 * app/favicon icon exactly (see public/favicon.svg).
 */
export function AppIconGlyph({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M26 8c-7.732 0-14 6.02-14 13.44C12 31.2 26 48 26 48s14-16.8 14-26.56C40 14.02 33.732 8 26 8Z"
        fill="#2F7D5A"
      />
      <circle cx="26" cy="21.5" r="5.2" fill="#FBFAF7" />
      <g transform="translate(29 28) scale(1.35)">
        <path d="M3 11l19-9-9 19-2-8-8-2z" fill="#141B18" />
      </g>
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
