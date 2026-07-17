import { useMemo, useState } from 'react';
import { MapPinOff } from 'lucide-react';
import type { SpotEvent, Category } from '../types';
import { SearchBar } from '../components/common/SearchBar';
import { CategoryCard } from '../components/cards/CategoryCard';
import { EventListItem } from '../components/cards/EventListItem';
import { CATEGORIES } from '../data/categories';
import { applyFilters, sortByDate } from '../lib/filters';
import { haversineKm } from '../lib/format';
import type { Coords } from '../lib/useUserLocation';

const NEAR_YOU_RADIUS_KM = 20;

interface DiscoverScreenProps {
  events: SpotEvent[];
  onOpen: (id: string) => void;
  onPickCategory: (category: Category) => void;
  userCoords: Coords;
}

export function DiscoverScreen({
  events,
  onOpen,
  onPickCategory,
  userCoords,
}: DiscoverScreenProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => (query.trim() ? applyFilters(events, {
      query,
      date: null,
      category: null,
      price: null,
    }) : null),
    [query, events],
  );

  const nearYou = useMemo(
    () =>
      events
        .map((e) => ({ e, km: haversineKm(userCoords.lat, userCoords.lng, e.lat, e.lng) }))
        .filter(({ km }) => km <= NEAR_YOU_RADIUS_KM)
        .sort((a, b) => a.km - b.km)
        .slice(0, 4)
        .map(({ e }) => e),
    [events, userCoords],
  );

  // Simple curated "recommended" = soonest free + paid highlights (non-personalized)
  const recommended = useMemo(() => sortByDate(events).slice(0, 6), [events]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) map[e.category] = (map[e.category] ?? 0) + 1;
    return map;
  }, [events]);

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-2 pt-6">
        <h1 className="font-serif text-[32px] leading-none text-ink">Discover</h1>
        <p className="mt-1 text-[13px] text-muted">
          Browse everything happening around you.
        </p>
        <div className="mt-4">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search events, venues, artists"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {results ? (
          <div className="space-y-2.5 pt-2">
            <p className="text-[12px] text-muted">
              {results.length} result{results.length === 1 ? '' : 's'} for “{query}”
            </p>
            {results.map((e) => (
              <EventListItem key={e.id} event={e} onClick={() => onOpen(e.id)} />
            ))}
            {results.length === 0 && (
              <p className="pt-8 text-center font-serif text-xl text-muted">
                Nothing found. Try another search.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Category grid */}
            <section className="pt-3">
              <h2 className="mb-3 font-serif text-xl text-ink">Categories</h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((c) => (
                  <CategoryCard
                    key={c.id}
                    category={c}
                    count={counts[c.id] ?? 0}
                    onClick={() => onPickCategory(c.id)}
                  />
                ))}
              </div>
            </section>

            {/* Near you */}
            <section className="pt-7">
              <h2 className="mb-3 font-serif text-xl text-ink">Near You</h2>
              {nearYou.length > 0 ? (
                <div className="space-y-2.5">
                  {nearYou.map((e) => (
                    <EventListItem key={e.id} event={e} onClick={() => onOpen(e.id)} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
                    <MapPinOff size={18} strokeWidth={1.8} />
                  </span>
                  <p className="text-[13px] leading-snug text-muted">
                    Nothing within {NEAR_YOU_RADIUS_KM} km yet — check back soon.
                  </p>
                </div>
              )}
            </section>

            {/* Recommended */}
            {recommended.length > 0 && (
              <section className="pt-7">
                <h2 className="mb-1 font-serif text-xl text-ink">Recommended</h2>
                <p className="mb-3 text-[12px] text-muted">Happening soon near you</p>
                <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
                  {recommended.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onOpen(e.id)}
                      className="w-[150px] shrink-0 text-left"
                    >
                      <div className="aspect-[3/4] overflow-hidden rounded-2xl shadow-soft">
                        <img
                          src={e.posterUrl}
                          alt={e.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="mt-1.5 truncate font-title text-[16px] leading-tight text-ink">
                        {e.title}
                      </p>
                      <p className="truncate text-[12px] text-muted">{e.venue}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
