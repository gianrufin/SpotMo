import { useEffect, useRef, useState } from 'react';

export interface Place {
  /** display name for the venue field, e.g. "saGuijo Café + Bar" */
  name: string;
  /** full formatted address line */
  address: string;
  city: string;
  lat: number;
  lng: number;
}

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
    countrycode?: string;
    osm_value?: string;
  };
}

function toPlace(f: PhotonFeature): Place {
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

/**
 * Keyless address autocomplete via Photon (OpenStreetMap). Debounced; biased to
 * the Philippines. Returns place suggestions with real coordinates. Falls back
 * to an empty list on any network/parse error, so the field stays usable.
 */
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
        // bias around the Philippines (approx center) + PH filter
        const url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
          `&limit=6&lang=en&lat=12.88&lon=121.77`;
        const res = await fetch(url, { signal: ac.signal });
        const data = await res.json();
        const feats: PhotonFeature[] = data.features ?? [];
        const places = feats
          .map(toPlace)
          .filter((p) => p.name);
        setResults(places);
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
