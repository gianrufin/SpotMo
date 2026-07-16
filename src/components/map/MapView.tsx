import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { SpotEvent } from '../../types';
import type { Coords } from '../../lib/useUserLocation';
import { posterPinIcon } from './posterPinIcon';
import { clusterIcon } from './clusterIcon';

interface MapViewProps {
  events: SpotEvent[];
  center: Coords;
  selectedId: string | null;
  onSelect: (id: string) => void;
  userCoords: Coords;
  showUser: boolean;
  flyToken: number; // bump to recenter on user
  dark: boolean;
  onInteractingChange: (interacting: boolean) => void;
}

/** Below this zoom, nearby pins collapse into numbered clusters. */
const SCATTER_ZOOM = 14;
const CELL_PX = 74;

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
      // center the map on the tapped pin (visible behind the detail sheet on close)
      map.flyTo([selectedEvent.lat, selectedEvent.lng], 15, { duration: 0.7 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id]);

  return null;
}

type Cell =
  | { type: 'single'; event: SpotEvent }
  | { type: 'cluster'; lat: number; lng: number; count: number };

// Grid-based clustering in projected pixel space at the current zoom.
function buildCells(events: SpotEvent[], map: L.Map, zoom: number): Cell[] {
  if (zoom >= SCATTER_ZOOM) return events.map((event) => ({ type: 'single', event }));
  const grid = new Map<string, SpotEvent[]>();
  for (const e of events) {
    const p = map.project([e.lat, e.lng], zoom);
    const key = `${Math.floor(p.x / CELL_PX)}:${Math.floor(p.y / CELL_PX)}`;
    (grid.get(key) ?? grid.set(key, []).get(key)!).push(e);
  }
  const cells: Cell[] = [];
  for (const group of grid.values()) {
    if (group.length === 1) {
      cells.push({ type: 'single', event: group[0] });
    } else {
      const lat = group.reduce((s, e) => s + e.lat, 0) / group.length;
      const lng = group.reduce((s, e) => s + e.lng, 0) / group.length;
      cells.push({ type: 'cluster', lat, lng, count: group.length });
    }
  }
  return cells;
}

// Renders event markers with zoom-aware clustering + reports pan/zoom activity.
function MarkerLayer({
  events,
  selectedId,
  onSelect,
  onInteractingChange,
}: {
  events: SpotEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInteractingChange: (interacting: boolean) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    movestart: () => onInteractingChange(true),
    moveend: () => {
      onInteractingChange(false);
      setZoom(map.getZoom());
    },
    zoomend: () => setZoom(map.getZoom()),
  });

  const cells = useMemo(
    () => buildCells(events, map, zoom),
    [events, zoom, map],
  );

  return (
    <>
      {cells.map((cell) =>
        cell.type === 'single' ? (
          <Marker
            key={cell.event.id}
            position={[cell.event.lat, cell.event.lng]}
            icon={posterPinIcon(cell.event, cell.event.id === selectedId)}
            zIndexOffset={cell.event.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(cell.event.id) }}
          />
        ) : (
          <Marker
            key={`cluster-${cell.lat.toFixed(4)}-${cell.lng.toFixed(4)}-${cell.count}`}
            position={[cell.lat, cell.lng]}
            icon={clusterIcon(cell.count)}
            eventHandlers={{
              click: () =>
                map.flyTo([cell.lat, cell.lng], Math.min(zoom + 3, 16), {
                  duration: 0.6,
                }),
            }}
          />
        ),
      )}
    </>
  );
}

const userIcon = L.divIcon({
  className: 'spotmo-pin',
  html: `<div class="spotmo-user-dot"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

export function MapView({
  events,
  center,
  selectedId,
  onSelect,
  userCoords,
  showUser,
  flyToken,
  dark,
  onInteractingChange,
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
        key={dark ? 'dark' : 'light'}
        url={dark ? TILES.dark : TILES.light}
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

      <MarkerLayer
        events={events}
        selectedId={selectedId}
        onSelect={onSelect}
        onInteractingChange={onInteractingChange}
      />

      <MapController
        center={center}
        flyToken={flyToken}
        selectedEvent={selectedEvent}
      />
    </MapContainer>
  );
}
