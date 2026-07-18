import type { SpotEvent } from '../../types';
import { PosterImage } from '../common/PosterImage';
import { relativeDayLabel } from '../../lib/format';
import { sortByDate } from '../../lib/filters';

interface EventSearchResultsProps {
  /** Already narrowed by the current query (and any other active filters) —
   * see MapScreen's `events` prop. */
  events: SpotEvent[];
  query: string;
  open: boolean;
  onSelect: (id: string) => void;
}

const MAX_RESULTS = 6;

/**
 * Event matches for the current search text — title, venue, city, address,
 * description, organizer, and lineup/performer names all count (see
 * lib/filters.ts's matchesQuery). Distinct from PlaceSearchResults, which
 * suggests map *locations* rather than events.
 */
export function EventSearchResults({ events, query, open, onSelect }: EventSearchResultsProps) {
  if (!open || !query.trim() || events.length === 0) return null;

  const sorted = sortByDate(events);
  const shown = sorted.slice(0, MAX_RESULTS);
  const remaining = sorted.length - shown.length;

  return (
    <ul className="pointer-events-auto max-h-72 overflow-y-auto rounded-2xl border border-hairline bg-card p-1 shadow-card">
      <li className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted">
        Events
      </li>
      {shown.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(event.id);
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-surface"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
              <PosterImage
                src={event.posterUrl}
                alt={event.title}
                category={event.category}
                className="h-full w-full"
              />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] text-ink">{event.title}</span>
              <span className="block truncate text-[12px] text-muted">
                {event.venue} · {relativeDayLabel(event.startsAt)}
              </span>
            </span>
          </button>
        </li>
      ))}
      {remaining > 0 && (
        <li className="px-3 py-1.5 text-[11.5px] text-muted">
          +{remaining} more on the map
        </li>
      )}
    </ul>
  );
}
