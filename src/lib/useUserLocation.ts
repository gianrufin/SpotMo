import { useCallback, useState } from 'react';

export interface Coords {
  lat: number;
  lng: number;
}

/** Metro Manila (Makati) fallback so the map always has a sensible center. */
export const MANILA: Coords = { lat: 14.5547, lng: 121.0244 };

export function useUserLocation() {
  const [coords, setCoords] = useState<Coords>(MANILA);
  const [status, setStatus] = useState<'idle' | 'locating' | 'granted' | 'denied'>(
    'idle',
  );

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('denied');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      },
      () => {
        setStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  return { coords, status, locate };
}
