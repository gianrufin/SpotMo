import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  /** bump to recenter the map (e.g. after an autocomplete pick) */
  focusToken: number;
  dark: boolean;
}

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

const pinIcon = L.divIcon({
  className: 'spotmo-pin',
  html: '<div class="spotmo-drag-pin"></div>',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

function Recenter({ focusToken, lat, lng }: { focusToken: number; lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);
  return null;
}

function ClickToPlace({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Free, keyless "drop a pin" picker so organizers can set the exact spot. */
export function LocationPicker({ lat, lng, onChange, focusToken, dark }: LocationPickerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        style={{ height: 190, width: '100%' }}
      >
        <TileLayer
          key={dark ? 'dark' : 'light'}
          url={dark ? TILES.dark : TILES.light}
          subdomains="abcd"
          maxZoom={20}
        />
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onChange(p.lat, p.lng);
            },
          }}
        />
        <Recenter focusToken={focusToken} lat={lat} lng={lng} />
        <ClickToPlace onChange={onChange} />
      </MapContainer>
    </div>
  );
}
