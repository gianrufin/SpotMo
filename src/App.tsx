import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Tab, EventFilters, Category, SpotEvent } from './types';
import { PhoneFrame } from './layout/PhoneFrame';
import { BottomNav } from './layout/BottomNav';
import { OnboardingFlow } from './screens/OnboardingFlow';
import { MapScreen } from './screens/MapScreen';
import { SavedScreen } from './screens/SavedScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OrganizerDashboard } from './screens/organizer/OrganizerDashboard';
import { OrganizerAuth } from './screens/organizer/OrganizerAuth';
import { CreateEventFlow } from './screens/organizer/CreateEventFlow';
import { SubmissionStatus } from './screens/organizer/SubmissionStatus';
import { AdminQueue } from './screens/admin/AdminQueue';
import { AdminGate } from './screens/admin/AdminGate';
import { EventDetail } from './components/event/EventDetail';
import { EVENTS } from './data/events';
import { EMPTY_FILTERS, applyFilters } from './lib/filters';
import { useSavedEvents } from './lib/useSavedEvents';
import { useOnboarding } from './lib/useOnboarding';
import { useSubmissions } from './lib/useSubmissions';
import { useUserLocation, type Coords } from './lib/useUserLocation';
import { useInstallPrompt } from './lib/useInstallPrompt';
import { useTheme } from './lib/useTheme';
import { useOrganizer } from './lib/useOrganizer';
import { useAdmin } from './lib/useAdmin';
import { haversineKm, formatDistance } from './lib/format';

type Overlay =
  | { kind: 'none' }
  | { kind: 'organizer' } // dashboard
  | { kind: 'create' } // create-event flow
  | { kind: 'submitted'; event: SpotEvent }
  | { kind: 'admin' };

export default function App() {
  const { seen, complete, reset } = useOnboarding();
  const { savedIds, isSaved, toggle } = useSavedEvents();
  const { submissions, approved, add, setStatus, remove, update } = useSubmissions();
  const location = useUserLocation();
  const install = useInstallPrompt();
  const theme = useTheme();
  const { organizer, signUp } = useOrganizer();
  const admin = useAdmin();
  const organizerName = organizer?.name ?? 'You';

  const [tab, setTab] = useState<Tab>('map');
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [center, setCenter] = useState<Coords>(location.coords);
  const [flyToken, setFlyToken] = useState(0);

  // ---- In-app back navigation ----
  // Keep the latest UI-layer state in refs so a single popstate listener can
  // decide what "back" should close, instead of the browser leaving the app.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const detailRef = useRef(detailId);
  detailRef.current = detailId;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    // A single "trap" entry sits ahead in history; every back press pops it,
    // we close one UI layer, then re-arm — so back navigates within the app
    // and never closes it.
    window.history.pushState(null, '');
    const onPop = () => {
      const o = overlayRef.current;
      if (o.kind === 'create' || o.kind === 'submitted') {
        setOverlay({ kind: 'organizer' });
      } else if (o.kind !== 'none') {
        setOverlay({ kind: 'none' });
      } else if (detailRef.current) {
        setDetailId(null);
      } else if (tabRef.current !== 'map') {
        setTab('map');
      }
      window.history.pushState(null, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const goBack = () => window.history.back();

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

  // Tapping a map pin highlights it and opens the event details directly.
  function selectPin(id: string) {
    setSelectedPinId(id);
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
            onSelectPin={selectPin}
            userCoords={location.coords}
            showUser={showUser}
            onLocate={handleLocate}
            center={center}
            flyToken={flyToken}
            dark={theme.isDark}
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
            canInstall={install.canInstall}
            installed={install.installed}
            onInstall={install.promptInstall}
            themePref={theme.pref}
            onSetTheme={theme.setPref}
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
              onBack={goBack}
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
            {overlay.kind === 'organizer' &&
              (organizer ? (
                <OrganizerDashboard
                  organizerName={organizer.name}
                  submissions={submissions.filter(
                    (s) => s.submittedBy === organizer.name,
                  )}
                  onBack={goBack}
                  onCreate={() => setOverlay({ kind: 'create' })}
                />
              ) : (
                <OrganizerAuth onBack={goBack} onSignUp={signUp} />
              ))}
            {overlay.kind === 'create' && (
              <CreateEventFlow
                dark={theme.isDark}
                onCancel={goBack}
                onSubmit={(event) => {
                  add(event, organizerName);
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
                onCreateAnother={() => setOverlay({ kind: 'create' })}
              />
            )}
            {overlay.kind === 'admin' &&
              (admin.unlocked ? (
                <AdminQueue
                  submissions={submissions}
                  onBack={goBack}
                  onSetStatus={setStatus}
                  onRemove={remove}
                  onUpdate={update}
                  dark={theme.isDark}
                />
              ) : (
                <AdminGate
                  hasPin={admin.hasPin}
                  onBack={goBack}
                  onSetPin={admin.setPin}
                  onUnlock={admin.unlock}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}
