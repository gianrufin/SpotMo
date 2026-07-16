import { useEffect, useRef, useState } from 'react';

export interface Place {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

// --- Photon (OpenStreetMap) — autocomplete-friendly ---
interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
  };
}

function photonToPlace(f: PhotonFeature): Place {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  const city = p.city || p.district || p.state || '';
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');
  const address = [streetLine, city, p.state]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');
  return {
    name: p.name || streetLine || city || 'Unnamed place',
    address: address || city || p.country || '',
    city,
    lat,
    lng,
  };
}

// --- Nominatim (OpenStreetMap) — broader POI coverage as a fallback ---
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
}

function nominatimToPlace(r: NominatimResult): Place {
  const a = r.address ?? {};
  const city =
    a.city || a.town || a.municipality || a.village || a.county || a.state || '';
  const name = r.name || r.display_name.split(',')[0];
  return {
    name: name || 'Unnamed place',
    address: r.display_name,
    city,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  };
}

const dedupeKey = (p: Place) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;

/** Query both providers (Philippines-biased) and merge, Photon first. */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const results: Place[] = [];
  const seen = new Set<string>();

  // Photon — fast type-ahead, biased to PH center
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      q,
    )}&limit=6&lang=en&lat=12.88&lon=121.77`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    for (const f of (data.features ?? []) as PhotonFeature[]) {
      const place = photonToPlace(f);
      const k = dedupeKey(place);
      if (!seen.has(k)) {
        seen.add(k);
        results.push(place);
      }
    }
  } catch {
    /* ignore — try Nominatim */
  }

  // Nominatim — broader coverage, restricted to the Philippines
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&q=${encodeURIComponent(q)}&countrycodes=ph&limit=6&addressdetails=1`;
    const res = await fetch(url, { signal });
    const data: NominatimResult[] = await res.json();
    for (const r of data) {
      const place = nominatimToPlace(r);
      const k = dedupeKey(place);
      if (!seen.has(k)) {
        seen.add(k);
        results.push(place);
      }
    }
  } catch {
    /* ignore */
  }

  return results.slice(0, 8);
}

/** One best match — used at submit time to place manually-typed venues. */
export async function geocodeOnce(query: string): Promise<Place | null> {
  const list = await searchPlaces(query).catch(() => []);
  return list[0] ?? null;
}

/** Debounced live autocomplete hook. */
export function useGeocode(query: string, enabled = true) {
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      setLoading(true);
      try {
        const places = await searchPlaces(q, ac.signal);
        if (!ac.signal.aborted) setResults(places);
      } catch {
        if (!ac.signal.aborted) setResults([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, enabled]);

  return { results, loading };
}
