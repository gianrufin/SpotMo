import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useGeocode, type Place } from '../../lib/useGeocode';

interface VenueAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (place: Place) => void;
  placeholder?: string;
}

/**
 * Venue field with live address autocomplete (keyless, OpenStreetMap/Photon).
 * Typing shows matching places; selecting one fills the venue, address, city,
 * and the event's real coordinates.
 */
export function VenueAutocomplete({
  value,
  onChangeText,
  onSelectPlace,
  placeholder = 'Search a venue or address',
}: VenueAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [justPicked, setJustPicked] = useState(false);
  const { results, loading } = useGeocode(open && !justPicked ? value : '');

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl bg-surface px-3">
        <MapPin size={16} strokeWidth={1.9} className="shrink-0 text-muted" />
        <input
          value={value}
          onChange={(e) => {
            onChangeText(e.target.value);
            setJustPicked(false);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-[14px] text-ink placeholder:text-muted focus:outline-none"
        />
        {loading && (
          <Loader2 size={16} className="shrink-0 animate-spin text-muted" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-hairline bg-card p-1 shadow-card">
          {results.map((place, i) => (
            <li key={`${place.lat}-${place.lng}-${i}`}>
              <button
                type="button"
                // onMouseDown fires before input blur so the pick registers
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectPlace(place);
                  setJustPicked(true);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-surface"
              >
                <MapPin
                  size={15}
                  strokeWidth={1.9}
                  className="mt-0.5 shrink-0 text-brand"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] text-ink">
                    {place.name}
                  </span>
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
      )}
    </div>
  );
}
