import { useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useGeocode, type Place } from '../../lib/useGeocode';
import { newSessionToken, resolveGooglePlace } from '../../lib/googlePlaces';
import type { Coords } from '../../lib/useUserLocation';

interface PlaceSearchResultsProps {
  query: string;
  open: boolean;
  onFlyToPlace: (coords: Coords, label: string) => void;
}

/**
 * Location suggestions shown under the map's search bar, distinct from the
 * event-title matches that already filter the pins live — picking one flies
 * the map there and drops a temporary marker (see MapView's `searchedPin`).
 */
export function PlaceSearchResults({ query, open, onFlyToPlace }: PlaceSearchResultsProps) {
  const sessionToken = useRef(newSessionToken());
  const [resolving, setResolving] = useState(false);
  const { results } = useGeocode(open ? query : '', true, sessionToken.current);

  async function pick(place: Place) {
    setResolving(true);
    try {
      if (place.needsResolve && place.placeId) {
        const resolved = await resolveGooglePlace(place.placeId, sessionToken.current);
        onFlyToPlace({ lat: resolved.lat, lng: resolved.lng }, resolved.name);
      } else {
        onFlyToPlace({ lat: place.lat, lng: place.lng }, place.name);
      }
    } catch {
      /* resolution failed (network/quota) — nothing to fly to, stay put */
    } finally {
      setResolving(false);
      sessionToken.current = newSessionToken();
    }
  }

  if (!open || query.trim().length < 3 || results.length === 0) return null;

  return (
    <ul className="pointer-events-auto max-h-64 overflow-y-auto rounded-2xl border border-hairline bg-card p-1 shadow-card">
      <li className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted">
        Locations
      </li>
      {results.map((place, i) => (
        <li key={place.placeId ?? `${place.lat}-${place.lng}-${i}`}>
          <button
            type="button"
            disabled={resolving}
            onMouseDown={(e) => {
              e.preventDefault();
              void pick(place);
            }}
            className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-surface disabled:opacity-50"
          >
            <MapPin size={15} strokeWidth={1.9} className="mt-0.5 shrink-0 text-brand" />
            <span className="min-w-0">
              <span className="block truncate text-[14px] text-ink">{place.name}</span>
              {place.address && (
                <span className="block truncate text-[12px] text-muted">
                  {place.address}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
