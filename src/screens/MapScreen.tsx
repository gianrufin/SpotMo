import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { LocateFixed, SlidersHorizontal } from 'lucide-react';
import type { SpotEvent, EventFilters, DateFilter } from '../types';
import type { Coords } from '../lib/useUserLocation';
import { MapView } from '../components/map/MapView';
import { SearchBar } from '../components/common/SearchBar';
import { FilterSheet } from '../components/map/FilterSheet';
import { PlaceSearchResults } from '../components/map/PlaceSearchResults';
import { EventSearchResults } from '../components/map/EventSearchResults';
import { VenueLineupSheet } from '../components/map/VenueLineupSheet';
import { Chip } from '../components/common/Chip';
import { Logo } from '../components/common/Logo';

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
  searchedPin: Coords | null;
  onFlyToPlace: (coords: Coords, label: string) => void;
}

const DATE_CHIPS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This Weekend' },
  { value: 'nextWeekend', label: 'Next Weekend' },
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
    searchedPin,
    onFlyToPlace,
  } = props;

  // Hide the top search/chips while the user pans or zooms; reveal when idle.
  const [interacting, setInteracting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [venueGroup, setVenueGroup] = useState<SpotEvent[] | null>(null);

  function toggleDate(value: DateFilter) {
    setFilters({ ...filters, date: filters.date === value ? null : value });
  }
  function toggleFree() {
    setFilters({ ...filters, price: filters.price === 'free' ? null : 'free' });
  }

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
          onSelectVenue={setVenueGroup}
          userCoords={userCoords}
          showUser={showUser}
          searchedPin={searchedPin}
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

        <div className="pointer-events-auto space-y-1.5">
          <SearchBar
            value={filters.query}
            onChange={(query) => setFilters({ ...filters, query })}
            placeholder="Search events, or a place on the map"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          />
          <EventSearchResults
            events={events}
            query={filters.query}
            open={searchFocused}
            onSelect={(id) => {
              onSelectPin(id);
              setFilters({ ...filters, query: '' });
              setSearchFocused(false);
            }}
          />
          <PlaceSearchResults
            query={filters.query}
            open={searchFocused}
            onFlyToPlace={(coords, label) => {
              onFlyToPlace(coords, label);
              setFilters({ ...filters, query: '' });
              setSearchFocused(false);
            }}
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
          <Chip active={filters.price === 'free'} onClick={toggleFree}>
            Free
          </Chip>
          <span className="mx-0.5 my-1 w-px shrink-0 bg-hairline" />
          <Chip
            active={Boolean(filters.category)}
            onClick={() => setShowFilters(true)}
            icon={<SlidersHorizontal size={14} strokeWidth={1.9} />}
          >
            Filters
          </Chip>
        </div>
      </div>

      {/* Locate button (right rail) */}
      <div className="absolute bottom-[104px] right-4 z-20 flex flex-col gap-2.5">
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

      <AnimatePresence>
        {showFilters && (
          <FilterSheet
            category={filters.category}
            onChangeCategory={(category) => setFilters({ ...filters, category })}
            onClose={() => setShowFilters(false)}
          />
        )}
        {venueGroup && (
          <VenueLineupSheet
            events={venueGroup}
            onOpen={(id) => {
              setVenueGroup(null);
              onSelectPin(id);
            }}
            onClose={() => setVenueGroup(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
