import type { SpotEvent, EventFilters } from '../types';
import { dateBucket } from './format';

export const EMPTY_FILTERS: EventFilters = {
  query: '',
  date: null,
  category: null,
  price: null,
};

function isThisWeekend(iso: string): boolean {
  const event = new Date(iso);
  const day = event.getDay(); // 0 = Sun, 6 = Sat
  if (day !== 0 && day !== 6) return false;
  // only the upcoming weekend: a Sat/Sun within the next 7 days
  const bucket = dateBucket(iso);
  return bucket === 'today' || bucket === 'tomorrow' || bucket === 'week';
}

function matchesDate(event: SpotEvent, filters: EventFilters): boolean {
  if (!filters.date) return true;
  const bucket = dateBucket(event.startsAt);
  if (filters.date === 'today') return bucket === 'today';
  if (filters.date === 'tomorrow') return bucket === 'tomorrow';
  if (filters.date === 'weekend') return isThisWeekend(event.startsAt);
  return true;
}

function matchesQuery(event: SpotEvent, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const haystack = [
    event.title,
    event.venue,
    event.city,
    event.address,
    ...(event.lineup ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function applyFilters(
  events: SpotEvent[],
  filters: EventFilters,
): SpotEvent[] {
  return events.filter((e) => {
    if (!matchesQuery(e, filters.query)) return false;
    if (!matchesDate(e, filters)) return false;
    if (filters.category && e.category !== filters.category) return false;
    if (filters.price === 'free' && !e.isFree) return false;
    if (filters.price === 'paid' && e.isFree) return false;
    return true;
  });
}

export function sortByDate(events: SpotEvent[]): SpotEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
