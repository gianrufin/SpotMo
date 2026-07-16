import type { SpotEvent } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}:00 ${ampm}` : `${h}:${pad(m)} ${ampm}`;
}

/** e.g. "May 24, 2025 (Sat) • 8:00 PM" */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} (${
    DAYS[d.getDay()]
  }) • ${formatTime(iso)}`;
}

/** short form for cards, e.g. "Fri, May 24 • 8:00 PM" */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} • ${formatTime(
    iso,
  )}`;
}

/** Human relative day label used on pins / chips */
export function relativeDayLabel(iso: string): string {
  const bucket = dateBucket(iso);
  switch (bucket) {
    case 'today':
      return 'Today';
    case 'tomorrow':
      return 'Tomorrow';
    case 'week':
      return DAYS[new Date(iso).getDay()];
    default:
      return `${MONTHS[new Date(iso).getMonth()]} ${new Date(iso).getDate()}`;
  }
}

export type DateBucketValue = 'today' | 'tomorrow' | 'week' | 'later';

export function dateBucket(iso: string): DateBucketValue {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const event = new Date(iso);
  const eventDay = new Date(event);
  eventDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (eventDay.getTime() - start.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays <= 7) return 'week';
  return 'later';
}

/** Emerald-forward color scale for date-coded pins */
export const BUCKET_COLOR: Record<DateBucketValue, string> = {
  today: '#2F7D5A', // emerald — happening now
  tomorrow: '#256A4C', // deep emerald
  week: '#3B7E72', // teal
  later: '#6B7280', // muted gray
};

export const BUCKET_LABEL: Record<DateBucketValue, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This week',
  later: 'Later',
};

/** Haversine distance in kilometers */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/** Rough walk/drive time from distance — no routing API, just a quick-glance
 * estimate: walking under ~1.5km, driving beyond that. */
export function formatTravelEstimate(km: number): string {
  const WALK_KMH = 4.5;
  const DRIVE_KMH = 22;
  if (km <= 1.5) {
    const min = Math.max(1, Math.round((km / WALK_KMH) * 60));
    return `~${min} min walk`;
  }
  const min = Math.max(1, Math.round((km / DRIVE_KMH) * 60 / 5) * 5);
  return `~${min} min drive`;
}

/** The moment an event stops being "current". Uses endsAt when the organizer
 * set one; otherwise assumes it runs through the end of its start day, so a
 * single-day event doesn't vanish from the map mid-evening. */
export function eventEndMoment(event: SpotEvent): Date {
  if (event.endsAt) return new Date(event.endsAt);
  const end = new Date(event.startsAt);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function hasEventEnded(event: SpotEvent): boolean {
  return eventEndMoment(event).getTime() < Date.now();
}

export function isHappeningNow(event: SpotEvent): boolean {
  const now = Date.now();
  return new Date(event.startsAt).getTime() <= now && now <= eventEndMoment(event).getTime();
}

/** Google Maps directions deep link (opens native maps app on mobile) */
export function directionsUrl(event: SpotEvent): string {
  const q = encodeURIComponent(`${event.venue}, ${event.address}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}&destination_place_id=&travelmode=driving`;
}

/** Static map thumbnail-free "Open in Maps" query link */
export function mapsSearchUrl(event: SpotEvent): string {
  const q = encodeURIComponent(`${event.venue}, ${event.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** A link that deep-links straight back to this event (see App.tsx's
 * `?event=` handling on load) — since there's no login/feed, a link is the
 * only way an event spreads beyond the app itself. */
export function eventShareUrl(event: SpotEvent): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = `?event=${encodeURIComponent(event.id)}`;
  url.hash = '';
  return url.toString();
}

/** Share via Web Share API, falling back to clipboard copy */
export async function shareEvent(event: SpotEvent): Promise<'shared' | 'copied' | 'failed'> {
  const text = `${event.title} · ${formatShortDate(event.startsAt)} · ${event.venue}`;
  const url = eventShareUrl(event);
  try {
    if (navigator.share) {
      await navigator.share({ title: `SpotMo — ${event.title}`, text, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
