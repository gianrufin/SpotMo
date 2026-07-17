import { useState } from 'react';
import type { Category } from '../../types';

interface PosterImageProps {
  src: string;
  alt: string;
  category?: Category;
  className?: string;
  /** show the title text on the gradient fallback (used for large posters) */
  showLabel?: boolean;
}

// Deterministic gradient per category — always painted behind the image so the
// poster area is never see-through, even if the remote image fails to load.
const GRADIENTS: Record<string, string> = {
  music: 'linear-gradient(135deg, #2F7D5A 0%, #1f5540 100%)',
  art: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  comedy: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  market: 'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)',
  community: 'linear-gradient(135deg, #2F7D5A 0%, #256A4C 100%)',
  food: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
  default: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
};

export function PosterImage({
  src,
  alt,
  category,
  className = '',
  showLabel = false,
}: PosterImageProps) {
  const [failed, setFailed] = useState(false);
  const gradient = GRADIENTS[category ?? 'default'] ?? GRADIENTS.default;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: gradient }}
    >
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {(failed || showLabel) && (
        <div className="absolute inset-0 flex items-center justify-center p-3">
          {failed && (
            <span className="text-center font-title text-lg leading-tight text-white/90">
              {alt}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
