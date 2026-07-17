import { MapPin } from 'lucide-react';
import type { SpotEvent } from '../../types';
import { PosterImage } from '../common/PosterImage';
import { formatShortDate, relativeDayLabel, isHappeningNow } from '../../lib/format';
import { categoryLabel } from '../../data/categories';

interface EventListItemProps {
  event: SpotEvent;
  onClick: () => void;
}

export function EventListItem({ event, onClick }: EventListItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-3xl bg-card p-2.5 text-left shadow-soft transition-all duration-150 hover:shadow-card active:scale-[0.99]"
    >
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl">
        <PosterImage
          src={event.posterUrl}
          alt={event.title}
          category={event.category}
          className="h-full w-full"
        />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-[11px] uppercase tracking-wide text-brand">
          {categoryLabel(event.category)}
        </p>
        <h3 className="truncate font-title text-[19px] leading-tight text-ink">
          {event.title}
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] text-muted">
          {formatShortDate(event.startsAt)}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-muted">
          <MapPin size={12} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">{event.venue}</span>
        </p>
      </div>
      {isHappeningNow(event) ? (
        <span className="mr-1 flex shrink-0 items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          Now
        </span>
      ) : (
        <span className="mr-1 shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink">
          {relativeDayLabel(event.startsAt)}
        </span>
      )}
    </button>
  );
}
