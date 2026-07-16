import { useMemo, useState } from 'react';
import { Heart, MapPin } from 'lucide-react';
import type { SpotEvent } from '../types';
import { EventListItem } from '../components/cards/EventListItem';
import { EmptyState } from '../components/common/EmptyState';
import { SegmentedTabs } from '../components/common/SegmentedTabs';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { sortByDate } from '../lib/filters';

interface SavedScreenProps {
  savedEvents: SpotEvent[];
  onOpen: (id: string) => void;
  onBrowseMap: () => void;
}

type View = 'events' | 'venues';

export function SavedScreen({
  savedEvents,
  onOpen,
  onBrowseMap,
}: SavedScreenProps) {
  const [view, setView] = useState<View>('events');

  const venues = useMemo(() => {
    const map = new Map<string, { venue: string; city: string; events: SpotEvent[] }>();
    for (const e of savedEvents) {
      const key = e.venue;
      if (!map.has(key)) map.set(key, { venue: e.venue, city: e.city, events: [] });
      map.get(key)!.events.push(e);
    }
    return [...map.values()];
  }, [savedEvents]);

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-3 pt-6">
        <h1 className="font-serif text-[32px] leading-none text-ink">Saved</h1>
        <p className="mt-1 text-[13px] text-muted">
          Events you've kept for later.
        </p>
        <div className="mt-4">
          <SegmentedTabs
            value={view}
            onChange={setView}
            options={[
              { value: 'events', label: 'Events' },
              { value: 'venues', label: 'Venues' },
            ]}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {savedEvents.length === 0 ? (
          <EmptyState
            icon={<Heart size={26} strokeWidth={1.6} />}
            title="Nothing saved yet"
            message="Tap the heart on any event to keep it here for later."
            action={
              <PrimaryButton variant="soft" onClick={onBrowseMap}>
                Explore the map
              </PrimaryButton>
            }
          />
        ) : view === 'events' ? (
          <div className="space-y-2.5 pt-1">
            {sortByDate(savedEvents).map((e) => (
              <EventListItem key={e.id} event={e} onClick={() => onOpen(e.id)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {venues.map((v) => (
              <div
                key={v.venue}
                className="rounded-3xl bg-white p-4 shadow-soft"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand">
                    <MapPin size={17} strokeWidth={1.9} />
                  </span>
                  <div>
                    <p className="font-serif text-lg leading-tight text-ink">
                      {v.venue}
                    </p>
                    <p className="text-[12px] text-muted">{v.city}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 border-t border-hairline pt-3">
                  {v.events.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onOpen(e.id)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="truncate text-[13.5px] text-ink">
                        {e.title}
                      </span>
                      <span className="shrink-0 text-[12px] text-muted">
                        {e.priceLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
