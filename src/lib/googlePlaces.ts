import type { Place } from './useGeocode';

const KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined;

/** True when a Google Maps Platform key is configured for Places (New). */
export const isGooglePlacesEnabled = Boolean(KEY);

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
  if (!res.ok) throw new Error(`Places autocomplete failed: ${res.status}`);
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
  if (!res.ok) throw new Error(`Place details failed: ${res.status}`);
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
