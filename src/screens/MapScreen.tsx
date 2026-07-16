import { useState } from 'react';
import { LocateFixed, SlidersHorizontal, X } from 'lucide-react';
import type { SpotEvent, EventFilters, DateFilter, Category } from '../types';
import type { Coords } from '../lib/useUserLocation';
import { MapView } from '../components/map/MapView';
import { SearchBar } from '../components/common/SearchBar';
import { Chip } from '../components/common/Chip';
import { Logo } from '../components/common/Logo';
import { CATEGORIES } from '../data/categories';

interface MapScreenProps {
  events: SpotEvent[];
  /** Whether any event exists at all, before filters — lets the empty state
   * tell "nothing posted yet" apart from "your filter matched nothing". */
  hasAnyEvents: boolean;
  filters: EventFilters;
  setFilters: (f: EventFilters) => void;
  selectedId: string | null;
  /** A pin tap opens the event details directly. */
  onSelectPin: (id: string) => void;
  userCoords: Coords;
  showUser: boolean;
  onLocate: () => void;
  center: Coords;
  flyToken: number;
  dark: boolean;
}

const DATE_CHIPS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This Weekend' },
];

export function MapScreen(props: MapScreenProps) {
  const {
    events,
    hasAnyEvents,
    filters,
    setFilters,
    selectedId,
    onSelectPin,
    userCoords,
    showUser,
    onLocate,
    center,
    flyToken,
    dark,
  } = props;

  // Hide the top search/chips while the user pans or zooms; reveal when idle.
  const [interacting, setInteracting] = useState(false);

  function toggleDate(value: DateFilter) {
    setFilters({ ...filters, date: filters.date === value ? null : value });
  }
  function toggleCategory(value: Category) {
    setFilters({
      ...filters,
      category: filters.category === value ? null : value,
    });
  }

  const activeFilterCount =
    (filters.category ? 1 : 0) + (filters.price ? 1 : 0);

  return (
    <div className="relative h-full w-full">
      {/* Map — `isolate` keeps Leaflet's internal panes (markers at z-index 600)
          from painting over the top bar / bottom nav as the map pans. */}
      <div className="absolute inset-0 isolate">
        <MapView
          events={events}
          center={center}
          selectedId={selectedId}
          onSelect={onSelectPin}
          userCoords={userCoords}
          showUser={showUser}
          flyToken={flyToken}
          dark={dark}
          onInteractingChange={setInteracting}
        />
      </div>

      {/* Top overlay: logo + search + chips — fades out while panning */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 space-y-2.5 p-4 pt-5 transition-all duration-300 ${
          interacting ? '-translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="pointer-events-auto flex items-center justify-between">
          <Logo size={24} />
          <span className="glass rounded-full px-3 py-1 text-[11px] text-muted shadow-soft">
            {events.length} nearby
          </span>
        </div>

        <div className="pointer-events-auto">
          <SearchBar
            value={filters.query}
            onChange={(query) => setFilters({ ...filters, query })}
          />
        </div>

        <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto">
          {DATE_CHIPS.map((c) => (
            <Chip
              key={c.value}
              active={filters.date === c.value}
              onClick={() => toggleDate(c.value)}
            >
              {c.label}
            </Chip>
          ))}
          <span className="mx-0.5 my-1 w-px shrink-0 bg-hairline" />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={filters.category === c.id}
              onClick={() => toggleCategory(c.id)}
              icon={<c.icon size={14} strokeWidth={1.9} />}
            >
              {c.label}
            </Chip>
          ))}
        </div>

        {activeFilterCount > 0 && (
          <div className="pointer-events-auto flex">
            <button
              onClick={() =>
                setFilters({ ...filters, category: null, price: null })
              }
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[12px] text-onink shadow-soft"
            >
              <X size={13} /> Clear {activeFilterCount} filter
              {activeFilterCount > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Price quick filter + locate button (right rail) */}
      <div className="absolute bottom-[104px] right-4 z-20 flex flex-col gap-2.5">
        <button
          onClick={() =>
            setFilters({
              ...filters,
              price: filters.price === 'free' ? null : 'free',
            })
          }
          className={`flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[12px] shadow-card transition active:scale-95 ${
            filters.price === 'free'
              ? 'bg-brand text-white'
              : 'glass text-ink'
          }`}
        >
          <SlidersHorizontal size={15} strokeWidth={1.9} />
          Free
        </button>
        <button
          onClick={onLocate}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-onink shadow-card transition active:scale-90"
          aria-label="Find my location"
        >
          <LocateFixed size={20} strokeWidth={1.9} />
        </button>
      </div>

      {/* Empty state: nothing posted yet vs. filters matching nothing */}
      {events.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-8">
          <div className="glass pointer-events-auto rounded-3xl px-6 py-5 text-center shadow-card">
            {hasAnyEvents ? (
              <>
                <p className="font-serif text-xl text-ink">No events match</p>
                <p className="mt-1 text-[13px] text-muted">
                  Try clearing a filter or searching a different area.
                </p>
              </>
            ) : (
              <>
                <p className="font-serif text-xl text-ink">Nothing posted yet</p>
                <p className="mt-1 text-[13px] text-muted">
                  New events will appear here as soon as they're live.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
