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
 * The SpotMo app icon mark — the provided "tokyo neon" artwork (an open
 * location-pin outline breaking into a navigation arrow, with a small accent
 * dot). Matches the installed app/PWA icon exactly (see public/app-icon.png).
 */
export function AppIconGlyph({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/app-icon.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return <AppIconGlyph size={size} />;
}
