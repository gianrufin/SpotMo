import type { Place } from './useGeocode';

const KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined;

/** True when a Google Maps Platform key is configured for Places (New). */
export const isGooglePlacesEnabled = Boolean(KEY);

export class GooglePlacesError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// --- Quota cooldown -----------------------------------------------------
// If Google's free-tier quota is exhausted, don't keep hammering it on every
// keystroke — fall back to the free OSM providers for the rest of the day,
// then automatically try Google again once the quota window has likely
// reset, with no redeploy or manual step needed.
const COOLDOWN_KEY = 'spotmo.places.cooldownUntil';

export function isGoogleInCooldown(): boolean {
  const until = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
  return Date.now() < until;
}

function startGoogleCooldown() {
  const nextReset = new Date();
  nextReset.setUTCHours(24, 0, 0, 0); // next UTC midnight
  localStorage.setItem(COOLDOWN_KEY, String(nextReset.getTime()));
}

/** Quota/rate-limit-shaped errors start a cooldown; other errors don't. */
function maybeStartCooldown(status: number) {
  if (status === 429 || status === 403) startGoogleCooldown();
}

/** A lightweight prediction — no coordinates yet (those cost a Place Details
 * call, so we only resolve them once the user actually picks a suggestion). */
export interface GooglePrediction {
  placeId: string;
  name: string;
  address: string;
}

export function newSessionToken(): string {
  return crypto.randomUUID();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function autocompleteGoogle(
  query: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<GooglePrediction[]> {
  if (!KEY) return [];
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
    },
    body: JSON.stringify({
      input: query,
      sessionToken,
      includedRegionCodes: ['ph'],
      languageCode: 'en',
    }),
  });
  if (!res.ok) {
    maybeStartCooldown(res.status);
    throw new GooglePlacesError(res.status, `Places autocomplete failed: ${res.status}`);
  }
  const data = await res.json();
  const suggestions: any[] = data.suggestions ?? [];
  return suggestions
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      placeId: p.placeId as string,
      name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? 'Unnamed place',
      address: p.structuredFormat?.secondaryText?.text ?? '',
    }));
}

/** Resolve a prediction to full coordinates — one billable call, only on selection. */
export async function resolveGooglePlace(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<Place> {
  if (!KEY) throw new Error('Google Places not configured');
  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
    `?sessionToken=${encodeURIComponent(sessionToken)}`;
  const res = await fetch(url, {
    signal,
    headers: {
      'X-Goog-Api-Key': KEY,
      // Minimal field mask — keeps this on the cheapest "basic data" tier.
      'X-Goog-FieldMask': 'displayName,formattedAddress,location,addressComponents',
    },
  });
  if (!res.ok) {
    maybeStartCooldown(res.status);
    throw new GooglePlacesError(res.status, `Place details failed: ${res.status}`);
  }
  const data = await res.json();
  const components: any[] = data.addressComponents ?? [];
  const findType = (t: string) =>
    components.find((c) => c.types?.includes(t))?.longText as string | undefined;
  const city =
    findType('locality') ||
    findType('administrative_area_level_2') ||
    findType('administrative_area_level_1') ||
    '';
  return {
    name: data.displayName?.text ?? 'Unnamed place',
    address: data.formattedAddress ?? '',
    city,
    lat: data.location?.latitude ?? 0,
    lng: data.location?.longitude ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
