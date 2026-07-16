import { AnimatePresence } from 'framer-motion';
import { LocateFixed, SlidersHorizontal, X } from 'lucide-react';
import type { SpotEvent, EventFilters, DateFilter, Category } from '../types';
import type { Coords } from '../lib/useUserLocation';
import { MapView } from '../components/map/MapView';
import { EventPreviewCard } from '../components/event/EventPreviewCard';
import { SearchBar } from '../components/common/SearchBar';
import { Chip } from '../components/common/Chip';
import { Logo } from '../components/common/Logo';
import { CATEGORIES } from '../data/categories';
import { haversineKm, formatDistance } from '../lib/format';

interface MapScreenProps {
  events: SpotEvent[];
  filters: EventFilters;
  setFilters: (f: EventFilters) => void;
  selectedId: string | null;
  onSelectPin: (id: string) => void;
  onClearSelection: () => void;
  onExpand: (id: string) => void;
  userCoords: Coords;
  showUser: boolean;
  onLocate: () => void;
  center: Coords;
  flyToken: number;
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
}

const DATE_CHIPS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This Weekend' },
];

export function MapScreen(props: MapScreenProps) {
  const {
    events,
    filters,
    setFilters,
    selectedId,
    onSelectPin,
    onClearSelection,
    onExpand,
    userCoords,
    showUser,
    onLocate,
    center,
    flyToken,
    isSaved,
    onToggleSave,
  } = props;

  const selected = events.find((e) => e.id === selectedId) ?? null;

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
      {/* Map */}
      <div className="absolute inset-0">
        <MapView
          events={events}
          center={center}
          selectedId={selectedId}
          onSelect={onSelectPin}
          userCoords={userCoords}
          showUser={showUser}
          flyToken={flyToken}
        />
      </div>

      {/* Top overlay: logo + search + chips */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 space-y-2.5 p-4 pt-5">
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
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[12px] text-white shadow-soft"
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
          className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-card transition active:scale-90"
          aria-label="Find my location"
        >
          <LocateFixed size={20} strokeWidth={1.9} />
        </button>
      </div>

      {/* Empty state when filters match nothing */}
      {events.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-8">
          <div className="glass pointer-events-auto rounded-3xl px-6 py-5 text-center shadow-card">
            <p className="font-serif text-xl text-ink">No events match</p>
            <p className="mt-1 text-[13px] text-muted">
              Try clearing a filter or searching a different area.
            </p>
          </div>
        </div>
      )}

      {/* Preview card */}
      <AnimatePresence>
        {selected && (
          <EventPreviewCard
            event={selected}
            saved={isSaved(selected.id)}
            onToggleSave={() => onToggleSave(selected.id)}
            onExpand={() => onExpand(selected.id)}
            onClose={onClearSelection}
            distanceLabel={
              showUser
                ? formatDistance(
                    haversineKm(
                      userCoords.lat,
                      userCoords.lng,
                      selected.lat,
                      selected.lng,
                    ),
                  )
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
