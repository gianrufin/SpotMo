import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { SpotEvent } from '../../types';
import type { Coords } from '../../lib/useUserLocation';
import { posterPinIcon } from './posterPinIcon';
import { clusterIcon } from './clusterIcon';
import { venueStackIcon } from './venueStackIcon';

interface MapViewProps {
  events: SpotEvent[];
  center: Coords;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Two or more events at the same venue — opens the venue's lineup sheet. */
  onSelectVenue: (events: SpotEvent[]) => void;
  userCoords: Coords;
  showUser: boolean;
  /** Temporary marker for a place the user just searched for. */
  searchedPin?: Coords | null;
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
  | { type: 'venue'; lat: number; lng: number; events: SpotEvent[] }
  | { type: 'cluster'; lat: number; lng: number; count: number };

// Events at (essentially) the same coordinates are the same venue — group
// them first so they never render as literally overlapping pins.
function groupByVenue(events: SpotEvent[]): SpotEvent[][] {
  const groups = new Map<string, SpotEvent[]>();
  for (const e of events) {
    const key = `${e.lat.toFixed(4)}:${e.lng.toFixed(4)}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(e);
  }
  return [...groups.values()];
}

function venueCell(group: SpotEvent[]): Cell {
  return group.length === 1
    ? { type: 'single', event: group[0] }
    : { type: 'venue', lat: group[0].lat, lng: group[0].lng, events: group };
}

// Grid-based clustering in projected pixel space at the current zoom, on top
// of venue grouping — a grid cell holding a single venue keeps its stacked-
// poster identity; multiple different venues merged by zoom become a
// generic numbered cluster.
function buildCells(events: SpotEvent[], map: L.Map, zoom: number): Cell[] {
  const venueGroups = groupByVenue(events);
  if (zoom >= SCATTER_ZOOM) return venueGroups.map(venueCell);

  const grid = new Map<string, SpotEvent[][]>();
  for (const group of venueGroups) {
    const p = map.project([group[0].lat, group[0].lng], zoom);
    const key = `${Math.floor(p.x / CELL_PX)}:${Math.floor(p.y / CELL_PX)}`;
    (grid.get(key) ?? grid.set(key, []).get(key)!).push(group);
  }
  const cells: Cell[] = [];
  for (const groups of grid.values()) {
    if (groups.length === 1) {
      cells.push(venueCell(groups[0]));
    } else {
      const allEvents = groups.flat();
      const lat = allEvents.reduce((s, e) => s + e.lat, 0) / allEvents.length;
      const lng = allEvents.reduce((s, e) => s + e.lng, 0) / allEvents.length;
      cells.push({ type: 'cluster', lat, lng, count: allEvents.length });
    }
  }
  return cells;
}

// Renders event markers with zoom-aware clustering + reports pan/zoom activity.
function MarkerLayer({
  events,
  selectedId,
  onSelect,
  onSelectVenue,
  onInteractingChange,
}: {
  events: SpotEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectVenue: (events: SpotEvent[]) => void;
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
      {cells.map((cell) => {
        if (cell.type === 'single') {
          return (
            <Marker
              key={cell.event.id}
              position={[cell.event.lat, cell.event.lng]}
              icon={posterPinIcon(cell.event, cell.event.id === selectedId)}
              zIndexOffset={cell.event.id === selectedId ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(cell.event.id) }}
            />
          );
        }
        if (cell.type === 'venue') {
          return (
            <Marker
              key={`venue-${cell.lat.toFixed(4)}-${cell.lng.toFixed(4)}`}
              position={[cell.lat, cell.lng]}
              icon={venueStackIcon(cell.events)}
              eventHandlers={{ click: () => onSelectVenue(cell.events) }}
            />
          );
        }
        return (
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
        );
      })}
    </>
  );
}

const userIcon = L.divIcon({
  className: 'spotmo-pin',
  html: `<div class="spotmo-user-dot"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const searchPinIcon = L.divIcon({
  className: 'spotmo-pin',
  html: `<div class="spotmo-search-pin"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
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
  onSelectVenue,
  userCoords,
  showUser,
  searchedPin,
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

      {searchedPin && (
        <Marker
          position={[searchedPin.lat, searchedPin.lng]}
          icon={searchPinIcon}
          interactive={false}
        />
      )}

      <MarkerLayer
        events={events}
        selectedId={selectedId}
        onSelect={onSelect}
        onSelectVenue={onSelectVenue}
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
