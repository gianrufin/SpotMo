import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SpotEvent } from '../../types';
import type { Coords } from '../../lib/useUserLocation';
import { posterPinIcon } from './posterPinIcon';

interface MapViewProps {
  events: SpotEvent[];
  center: Coords;
  selectedId: string | null;
  onSelect: (id: string) => void;
  userCoords: Coords;
  showUser: boolean;
  flyToken: number; // bump to recenter on user
}

// Recenters the map imperatively when center / flyToken changes.
function MapController({
  center,
  flyToken,
  selectedEvent,
}: {
  center: Coords;
  flyToken: number;
  selectedEvent: SpotEvent | null;
}) {
  const map = useMap();
  const firstFly = useRef(true);

  useEffect(() => {
    map.flyTo([center.lat, center.lng], 14, { duration: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken]);

  useEffect(() => {
    if (firstFly.current) {
      firstFly.current = false;
      return;
    }
    if (selectedEvent) {
      // offset upward so the pin sits above the preview card
      const target = map.project([selectedEvent.lat, selectedEvent.lng], 15);
      target.y += 120;
      const latlng = map.unproject(target, 15);
      map.flyTo(latlng, 15, { duration: 0.7 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id]);

  return null;
}

const userIcon = L.divIcon({
  className: 'spotmo-pin',
  html: `<div class="spotmo-user-dot"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function MapView({
  events,
  center,
  selectedId,
  onSelect,
  userCoords,
  showUser,
  flyToken,
}: MapViewProps) {
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      zoomControl={false}
      attributionControl
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {showUser && (
        <Marker
          position={[userCoords.lat, userCoords.lng]}
          icon={userIcon}
          interactive={false}
        />
      )}

      {events.map((event) => (
        <Marker
          key={event.id}
          position={[event.lat, event.lng]}
          icon={posterPinIcon(event, event.id === selectedId)}
          zIndexOffset={event.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(event.id) }}
        />
      ))}

      <MapController
        center={center}
        flyToken={flyToken}
        selectedEvent={selectedEvent}
      />
    </MapContainer>
  );
}
