import { MapPin, Heart, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SpotEvent } from '../../types';
import { PosterImage } from '../common/PosterImage';
import { formatShortDate } from '../../lib/format';
import { categoryLabel } from '../../data/categories';

interface EventPreviewCardProps {
  event: SpotEvent;
  saved: boolean;
  onToggleSave: () => void;
  onExpand: () => void;
  onClose: () => void;
  distanceLabel?: string;
}

export function EventPreviewCard({
  event,
  saved,
  onToggleSave,
  onExpand,
  distanceLabel,
}: EventPreviewCardProps) {
  return (
    <motion.div
      key={event.id}
      initial={{ y: 140, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 140, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="absolute inset-x-3 bottom-[92px] z-30"
    >
      <div
        className="glass flex items-stretch gap-3 rounded-3xl p-2.5 shadow-card"
        onClick={onExpand}
        role="button"
      >
        <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-2xl">
          <PosterImage
            src={event.posterUrl}
            alt={event.title}
            category={event.category}
            className="h-full w-full"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-brand">
              {categoryLabel(event.category)}
            </p>
            <h3 className="truncate font-serif text-[21px] leading-tight text-ink">
              {event.title}
            </h3>
            <p className="mt-0.5 truncate text-[12.5px] text-muted">
              {formatShortDate(event.startsAt)}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-muted">
              <MapPin size={12} strokeWidth={1.75} className="shrink-0" />
              <span className="truncate">
                {event.venue}
                {distanceLabel ? ` · ${distanceLabel}` : ''}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-[12px] text-muted">
            <ChevronUp size={14} /> Tap for details
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full bg-white/80 shadow-soft transition active:scale-90"
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <Heart
            size={18}
            strokeWidth={1.9}
            className={saved ? 'text-brand' : 'text-ink'}
            fill={saved ? '#10B981' : 'none'}
          />
        </button>
      </div>
    </motion.div>
  );
}
