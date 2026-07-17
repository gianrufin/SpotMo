import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  Tab,
  EventFilters,
  Category,
  SpotEvent,
  SubmissionStatus as EventStatus,
} from './types';
import { PhoneFrame } from './layout/PhoneFrame';
import { BottomNav } from './layout/BottomNav';
import { OnboardingFlow } from './screens/OnboardingFlow';
import { MapScreen } from './screens/MapScreen';
import { SavedScreen } from './screens/SavedScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OrganizerDashboard } from './screens/organizer/OrganizerDashboard';
import { OrganizerAuth } from './screens/organizer/OrganizerAuth';
import { RequestAccess } from './screens/organizer/RequestAccess';
import { OrganizerStatusScreen } from './screens/organizer/OrganizerStatusScreen';
import { CreateEventFlow } from './screens/organizer/CreateEventFlow';
import { SubmissionStatus } from './screens/organizer/SubmissionStatus';
import { AdminQueue } from './screens/admin/AdminQueue';
import { AdminGate } from './screens/admin/AdminGate';
import { NotAdmin } from './screens/admin/NotAdmin';
import { OrganizersManager } from './screens/admin/OrganizersManager';
import { AuthPanel } from './screens/auth/AuthPanel';
import { EventDetail } from './components/event/EventDetail';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { EVENTS } from './data/events';
import { EMPTY_FILTERS, applyFilters } from './lib/filters';
import { useSavedEvents } from './lib/useSavedEvents';
import { useOnboarding } from './lib/useOnboarding';
import { useSubmissions } from './lib/useSubmissions';
import { useUserLocation, type Coords } from './lib/useUserLocation';
import { useInstallPrompt } from './lib/useInstallPrompt';
import { useTheme } from './lib/useTheme';
import { useSavedReminders } from './lib/useSavedReminders';
import { useAdminNotifications } from './lib/useAdminNotifications';
import { useOrganizer } from './lib/useOrganizer';
import { useAdmin } from './lib/useAdmin';
import { useAuth } from './lib/useAuth';
import { useRemoteEvents } from './lib/useRemoteEvents';
import { useMyOrganizerProfile } from './lib/useMyOrganizerProfile';
import { useOrganizersAdmin } from './lib/useOrganizersAdmin';
import { useAdminsRoster } from './lib/useAdminsRoster';
import { requestOrganizerAccess } from './lib/organizerAccess';
import { isSupabaseEnabled } from './lib/supabase';
import { haversineKm, formatTravelEstimate, hasEventEnded } from './lib/format';

type Overlay =
  | { kind: 'none' }
  | { kind: 'organizer' } // dashboard
  | { kind: 'create' } // create-event flow
  | { kind: 'submitted'; event: SpotEvent }
  | { kind: 'admin' }
  | { kind: 'organizers-manager' };

export default function App() {
  const { seen, complete, reset } = useOnboarding();
  const { savedIds, isSaved, toggle } = useSavedEvents();
  const location = useUserLocation();
  const install = useInstallPrompt();
  const theme = useTheme();

  // Data + auth: Supabase-backed when configured, else on-device local mode.
  const remoteMode = isSupabaseEnabled;
  const auth = useAuth();
  const local = useSubmissions();
  const localOrg = useOrganizer();
  const localAdmin = useAdmin();
  const remote = useRemoteEvents(auth.session, auth.isAdmin);
  const myProfile = useMyOrganizerProfile(auth.session);
  const organizersAdmin = useOrganizersAdmin(auth.isAdmin);
  const adminsRoster = useAdminsRoster(auth.isAdmin, auth.session?.user.id ?? null);

  // Unified data surface (same shape regardless of backend)
  const approved = remoteMode ? remote.approved : local.approved;
  const organizerName = remoteMode
    ? myProfile.profile?.org_name || auth.name || auth.email || 'You'
    : localOrg.organizer?.name ?? 'You';
  const organizerInstagram = remoteMode ? myProfile.profile?.instagram_url ?? undefined : undefined;
  const mySubmissions = remoteMode
    ? remote.mine
    : local.submissions.filter((s) => s.submittedBy === organizerName);
  const allSubmissions = remoteMode ? remote.all : local.submissions;

  type MutationResult = { ok: boolean; error?: string };
  async function setStatus(id: string, status: EventStatus): Promise<MutationResult> {
    if (remoteMode) return remote.setStatus(id, status);
    local.setStatus(id, status);
    return { ok: true };
  }
  async function removeEvent(id: string): Promise<MutationResult> {
    if (remoteMode) return remote.remove(id);
    local.remove(id);
    return { ok: true };
  }
  async function updateEvent(
    id: string,
    patch: Partial<SpotEvent>,
  ): Promise<MutationResult> {
    if (remoteMode) return remote.update(id, patch);
    local.update(id, patch);
    return { ok: true };
  }

  async function submitEvent(
    event: SpotEvent,
  ): Promise<{ ok: boolean; error?: string }> {
    if (remoteMode) return remote.add(event, organizerName, organizerInstagram);
    local.add({ ...event, organizerInstagram }, organizerName);
    return { ok: true };
  }

  // Organizer access state — separate from admin-ness entirely, EXCEPT that
  // an admin can always add/edit their own events too (they don't need a
  // separate organizers-roster row for that).
  type OrganizerAccessState =
    | 'not-signed-in'
    | 'loading'
    | 'approved'
    | 'pending'
    | 'revoked'
    | 'not-requested';
  const organizerAccessState: OrganizerAccessState = !remoteMode
    ? localOrg.organizer
      ? 'approved'
      : localAdmin.unlocked
        ? 'approved'
        : 'not-signed-in'
    : !auth.session
      ? 'not-signed-in'
      : auth.isAdmin
        ? 'approved'
        : myProfile.loading
          ? 'loading'
          : myProfile.profile?.status === 'approved'
            ? 'approved'
            : myProfile.profile?.status === 'pending'
              ? 'pending'
              : myProfile.profile?.status === 'revoked'
                ? 'revoked'
                : 'not-requested';

  // Unified role for the Profile screen's sign-in section — one clear
  // "signed in as X" state instead of scattered role checks.
  type ProfileRole =
    | 'signed-out'
    | 'loading'
    | 'admin'
    | 'organizer'
    | 'pending'
    | 'revoked'
    | 'not-requested';
  const profileRole: ProfileRole = !remoteMode
    ? localAdmin.unlocked
      ? 'admin'
      : localOrg.organizer
        ? 'organizer'
        : 'signed-out'
    : !auth.session
      ? 'signed-out'
      : auth.isAdmin
        ? 'admin'
        : myProfile.loading
          ? 'loading'
          : myProfile.profile?.status === 'approved'
            ? 'organizer'
            : myProfile.profile?.status === 'pending'
              ? 'pending'
              : myProfile.profile?.status === 'revoked'
                ? 'revoked'
                : 'not-requested';

  const [tab, setTab] = useState<Tab>('map');
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [center, setCenter] = useState<Coords>(location.coords);
  const [flyToken, setFlyToken] = useState(0);
  const [searchedPin, setSearchedPin] = useState<Coords | null>(null);

  // The home screen defaults to the user's real location — request it right
  // away on launch (the browser's native permission prompt, not gated behind
  // an in-app tap) rather than waiting for the onboarding step. Falls back to
  // Makati (see useUserLocation's MANILA constant) if denied/unavailable.
  useEffect(() => {
    location.locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (location.status === 'granted') {
      setCenter(location.coords);
      setFlyToken((t) => t + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.status]);

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

  async function handleSignOut() {
    await auth.signOut();
    setOverlay({ kind: 'none' });
  }

  function signOutOfProfile() {
    if (remoteMode) {
      void handleSignOut();
    } else {
      localAdmin.lock();
      localOrg.signOut();
    }
  }

  // Every "Sign out" button routes through here first — one confirm dialog,
  // regardless of which screen/role triggered it.
  const [pendingSignOut, setPendingSignOut] = useState<(() => void) | null>(null);
  function confirmSignOut(action: () => void) {
    setPendingSignOut(() => action);
  }

  // Live map data = curated events + approved submissions
  // Public-facing views only ever show events that haven't ended yet — an
  // approved-but-past event should quietly disappear rather than clutter the
  // map. Organizer/admin management screens use their own unfiltered feeds.
  const allEvents = useMemo<SpotEvent[]>(
    () => [...EVENTS, ...approved].filter((e) => !hasEventEnded(e)),
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
  const reminders = useSavedReminders(savedEvents);
  const adminNotifications = useAdminNotifications(auth.isAdmin);

  // Shareable event links: a `?event=<id>` URL (see lib/format.ts
  // eventShareUrl) opens straight to that event once it's loaded — the only
  // way an event spreads beyond the app itself, since there's no login/feed.
  const [pendingSharedId, setPendingSharedId] = useState<string | null>(() =>
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('event'),
  );
  useEffect(() => {
    if (!pendingSharedId) return;
    const found = allEvents.find((e) => e.id === pendingSharedId);
    if (found) {
      setDetailId(found.id);
      setPendingSharedId(null);
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState(null, '', url.toString());
    }
  }, [pendingSharedId, allEvents]);

  const detailEvent = detailId
    ? allEvents.find((e) => e.id === detailId) ?? null
    : null;

  const showUser = location.status === 'granted';

  function distanceLabel(e: SpotEvent | null): string | undefined {
    if (!e || !showUser) return undefined;
    return formatTravelEstimate(
      haversineKm(location.coords.lat, location.coords.lng, e.lat, e.lng),
    );
  }

  function handleLocate() {
    location.locate();
    setCenter(location.coords);
    setFlyToken((t) => t + 1);
  }

  // A place picked from the map's location search — fly there and drop a
  // temporary marker so it's clear why the map moved (cleared after a bit,
  // or as soon as the user searches somewhere else).
  function handleFlyToPlace(coords: Coords) {
    setCenter(coords);
    setFlyToken((t) => t + 1);
    setSearchedPin(coords);
    setTimeout(() => {
      setSearchedPin((current) =>
        current && current.lat === coords.lat && current.lng === coords.lng ? null : current,
      );
    }, 20_000);
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
            hasAnyEvents={allEvents.length > 0}
            filters={filters}
            setFilters={setFilters}
            selectedId={selectedPinId}
            onSelectPin={selectPin}
            userCoords={location.coords}
            showUser={showUser}
            onLocate={handleLocate}
            center={center}
            flyToken={flyToken}
            searchedPin={searchedPin}
            onFlyToPlace={handleFlyToPlace}
            dark={theme.isDark}
          />
        )}

        {tab === 'saved' && (
          <SavedScreen
            savedEvents={savedEvents}
            startingSoon={reminders.startingSoon}
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
            role={profileRole}
            email={remoteMode ? auth.email : localOrg.organizer?.email ?? null}
            organizerName={organizerName}
            savedCount={savedIds.length}
            submissionCount={mySubmissions.length}
            pendingCount={allSubmissions.filter((s) => s.status === 'pending').length}
            onOpenOrganizer={() => setOverlay({ kind: 'organizer' })}
            onOpenAdmin={() => setOverlay({ kind: 'admin' })}
            onOpenOrganizersManager={
              remoteMode ? () => setOverlay({ kind: 'organizers-manager' }) : undefined
            }
            onSignOut={() => confirmSignOut(signOutOfProfile)}
            onResetOnboarding={reset}
            canInstall={install.canInstall}
            installed={install.installed}
            onInstall={install.promptInstall}
            themePref={theme.pref}
            onSetTheme={theme.setPref}
            remindersEnabled={reminders.enabled}
            canNotify={reminders.canNotify}
            onEnableReminders={() => void reminders.enableReminders()}
            onDisableReminders={reminders.disableReminders}
            adminNotificationsEnabled={adminNotifications.enabled}
            canAdminNotify={adminNotifications.canNotify}
            onEnableAdminNotifications={() => void adminNotifications.enableNotifications()}
            onDisableAdminNotifications={adminNotifications.disableNotifications}
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
              (organizerAccessState === 'approved' ? (
                <OrganizerDashboard
                  organizerName={organizerName}
                  instagramUrl={myProfile.profile?.instagram_url}
                  submissions={mySubmissions}
                  onBack={goBack}
                  onCreate={() => setOverlay({ kind: 'create' })}
                  onSignOut={remoteMode ? () => confirmSignOut(handleSignOut) : undefined}
                  onEditName={
                    remoteMode && myProfile.profile ? myProfile.updateOrgName : undefined
                  }
                  onEditInstagram={
                    remoteMode && myProfile.profile ? myProfile.updateInstagram : undefined
                  }
                  onUpdate={updateEvent}
                  dark={theme.isDark}
                />
              ) : organizerAccessState === 'loading' ? (
                <div className="flex h-full items-center justify-center bg-bg text-[14px] text-muted">
                  Loading…
                </div>
              ) : organizerAccessState === 'not-signed-in' ? (
                remoteMode ? (
                  <RequestAccess
                    onBack={goBack}
                    onSignIn={auth.signIn}
                    onSignUp={auth.signUp}
                  />
                ) : (
                  <OrganizerAuth onBack={goBack} onSignUp={localOrg.signUp} />
                )
              ) : (
                <OrganizerStatusScreen
                  status={organizerAccessState}
                  email={auth.email}
                  onBack={goBack}
                  onSignOut={() => confirmSignOut(handleSignOut)}
                  onRequestNow={
                    organizerAccessState === 'not-requested'
                      ? async () => {
                          const result = await requestOrganizerAccess(auth.email!);
                          if (result.ok) await myProfile.refresh();
                          return result;
                        }
                      : undefined
                  }
                />
              ))}
            {overlay.kind === 'create' && (
              <CreateEventFlow
                dark={theme.isDark}
                onCancel={goBack}
                onSubmit={async (event) => {
                  const result = await submitEvent(event);
                  if (result.ok) setOverlay({ kind: 'submitted', event });
                  return result;
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
              (remoteMode ? (
                !auth.session ? (
                  <AuthPanel
                    variant="admin"
                    onBack={goBack}
                    onSignIn={auth.signIn}
                    onSignUp={auth.signUp}
                  />
                ) : !auth.isAdmin ? (
                  <NotAdmin
                    email={auth.email}
                    onBack={goBack}
                    onSignOut={() => confirmSignOut(handleSignOut)}
                  />
                ) : (
                  <AdminQueue
                    submissions={allSubmissions}
                    onBack={goBack}
                    onSetStatus={setStatus}
                    onRemove={removeEvent}
                    onUpdate={updateEvent}
                    dark={theme.isDark}
                  />
                )
              ) : localAdmin.unlocked ? (
                <AdminQueue
                  submissions={allSubmissions}
                  onBack={goBack}
                  onSetStatus={setStatus}
                  onRemove={removeEvent}
                  onUpdate={updateEvent}
                  dark={theme.isDark}
                />
              ) : (
                <AdminGate
                  hasPin={localAdmin.hasPin}
                  onBack={goBack}
                  onSetPin={localAdmin.setPin}
                  onUnlock={localAdmin.unlock}
                />
              ))}
            {overlay.kind === 'organizers-manager' && remoteMode &&
              (!auth.session ? (
                <AuthPanel
                  variant="admin"
                  onBack={goBack}
                  onSignIn={auth.signIn}
                  onSignUp={auth.signUp}
                />
              ) : !auth.isAdmin ? (
                <NotAdmin
                  email={auth.email}
                  onBack={goBack}
                  onSignOut={() => confirmSignOut(handleSignOut)}
                />
              ) : (
                <OrganizersManager
                  organizers={organizersAdmin.organizers}
                  onBack={goBack}
                  onApprove={(id) => organizersAdmin.setStatus(id, 'approved')}
                  onRevoke={(id) => organizersAdmin.setStatus(id, 'revoked')}
                  onUpdateName={organizersAdmin.updateOrgName}
                  onRemove={organizersAdmin.remove}
                  onAdd={organizersAdmin.addOrganizer}
                  isAdminUser={(userId) => adminsRoster.adminIds.has(userId)}
                  canDemote={adminsRoster.canDemote}
                  onPromote={adminsRoster.promote}
                  onDemote={adminsRoster.demote}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {pendingSignOut && (
        <ConfirmDialog
          title="Sign out?"
          message="You'll need to sign in again to get back to your organizer or admin tools."
          confirmLabel="Sign out"
          danger
          onCancel={() => setPendingSignOut(null)}
          onConfirm={() => {
            const action = pendingSignOut;
            setPendingSignOut(null);
            action();
          }}
        />
      )}
    </PhoneFrame>
  );
}
