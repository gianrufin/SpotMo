import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Tab, EventFilters, Category, SpotEvent } from './types';
import { PhoneFrame } from './layout/PhoneFrame';
import { BottomNav } from './layout/BottomNav';
import { OnboardingFlow } from './screens/OnboardingFlow';
import { MapScreen } from './screens/MapScreen';
import { SavedScreen } from './screens/SavedScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CreateEventFlow } from './screens/organizer/CreateEventFlow';
import { SubmissionStatus } from './screens/organizer/SubmissionStatus';
import { AdminQueue } from './screens/admin/AdminQueue';
import { EventDetail } from './components/event/EventDetail';
import { EVENTS } from './data/events';
import { EMPTY_FILTERS, applyFilters } from './lib/filters';
import { useSavedEvents } from './lib/useSavedEvents';
import { useOnboarding } from './lib/useOnboarding';
import { useSubmissions } from './lib/useSubmissions';
import { useUserLocation, type Coords } from './lib/useUserLocation';
import { haversineKm, formatDistance } from './lib/format';

type Overlay =
  | { kind: 'none' }
  | { kind: 'organizer' }
  | { kind: 'submitted'; event: SpotEvent }
  | { kind: 'admin' };

export default function App() {
  const { seen, complete, reset } = useOnboarding();
  const { savedIds, isSaved, toggle } = useSavedEvents();
  const { submissions, approved, add, setStatus, remove } = useSubmissions();
  const location = useUserLocation();

  const [tab, setTab] = useState<Tab>('map');
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [center, setCenter] = useState<Coords>(location.coords);
  const [flyToken, setFlyToken] = useState(0);

  // Live map data = curated events + approved submissions
  const allEvents = useMemo<SpotEvent[]>(
    () => [...EVENTS, ...approved],
    [approved],
  );
  const mapEvents = useMemo(
    () => applyFilters(allEvents, filters),
    [allEvents, filters],
  );

  const savedEvents = useMemo(
    () => savedIds.map((id) => allEvents.find((e) => e.id === id)).filter(Boolean) as SpotEvent[],
    [savedIds, allEvents],
  );

  const detailEvent = detailId
    ? allEvents.find((e) => e.id === detailId) ?? null
    : null;

  const showUser = location.status === 'granted';

  function distanceLabel(e: SpotEvent | null): string | undefined {
    if (!e || !showUser) return undefined;
    return formatDistance(
      haversineKm(location.coords.lat, location.coords.lng, e.lat, e.lng),
    );
  }

  function handleLocate() {
    location.locate();
    setCenter(location.coords);
    setFlyToken((t) => t + 1);
  }

  function openDetail(id: string) {
    setDetailId(id);
  }

  function pickCategory(category: Category) {
    setFilters({ ...EMPTY_FILTERS, category });
    setSelectedPinId(null);
    setTab('map');
  }

  // ---- Onboarding gate ----
  if (!seen) {
    return (
      <PhoneFrame>
        <OnboardingFlow
          onDone={complete}
          onAllowLocation={() => {
            location.locate();
            setFlyToken((t) => t + 1);
          }}
        />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      {/* Tab content — `isolate` contains Leaflet's internal z-indices so the
          full-screen detail / organizer sheets always paint above the map. */}
      <div className="relative isolate flex-1 overflow-hidden">
        {tab === 'map' && (
          <MapScreen
            events={mapEvents}
            filters={filters}
            setFilters={setFilters}
            selectedId={selectedPinId}
            onSelectPin={setSelectedPinId}
            onClearSelection={() => setSelectedPinId(null)}
            onExpand={openDetail}
            userCoords={location.coords}
            showUser={showUser}
            onLocate={handleLocate}
            center={center}
            flyToken={flyToken}
            isSaved={isSaved}
            onToggleSave={toggle}
          />
        )}

        {tab === 'saved' && (
          <SavedScreen
            savedEvents={savedEvents}
            onOpen={openDetail}
            onBrowseMap={() => setTab('map')}
          />
        )}

        {tab === 'discover' && (
          <DiscoverScreen
            events={allEvents}
            onOpen={openDetail}
            onPickCategory={pickCategory}
            userCoords={location.coords}
          />
        )}

        {tab === 'profile' && (
          <ProfileScreen
            savedCount={savedIds.length}
            submissionCount={submissions.length}
            pendingCount={submissions.filter((s) => s.status === 'pending').length}
            onOpenOrganizer={() => setOverlay({ kind: 'organizer' })}
            onOpenAdmin={() => setOverlay({ kind: 'admin' })}
            onResetOnboarding={reset}
          />
        )}
      </div>

      {/* Bottom nav (hidden while a full overlay/detail is open) */}
      {overlay.kind === 'none' && !detailEvent && (
        <BottomNav active={tab} onChange={setTab} savedCount={savedIds.length} />
      )}

      {/* Full event detail overlay */}
      <AnimatePresence>
        {detailEvent && (
          <motion.div
            className="absolute inset-0 z-50"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 320 }}
          >
            <EventDetail
              event={detailEvent}
              saved={isSaved(detailEvent.id)}
              onToggleSave={() => toggle(detailEvent.id)}
              onBack={() => setDetailId(null)}
              distanceLabel={distanceLabel(detailEvent)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Organizer / admin overlays */}
      <AnimatePresence>
        {overlay.kind !== 'none' && (
          <motion.div
            className="absolute inset-0 z-[60]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 320 }}
          >
            {overlay.kind === 'organizer' && (
              <CreateEventFlow
                onCancel={() => setOverlay({ kind: 'none' })}
                onSubmit={(event) => {
                  add(event, 'You');
                  setOverlay({ kind: 'submitted', event });
                }}
              />
            )}
            {overlay.kind === 'submitted' && (
              <SubmissionStatus
                event={overlay.event}
                onDone={() => {
                  setOverlay({ kind: 'none' });
                  setTab('map');
                }}
                onCreateAnother={() => setOverlay({ kind: 'organizer' })}
              />
            )}
            {overlay.kind === 'admin' && (
              <AdminQueue
                submissions={submissions}
                onBack={() => setOverlay({ kind: 'none' })}
                onSetStatus={setStatus}
                onRemove={remove}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}
