import L from 'leaflet';
import type { SpotEvent } from '../../types';
import { BUCKET_COLOR, dateBucket, relativeDayLabel } from '../../lib/format';

/**
 * Builds a Leaflet divIcon that renders an event as a rounded poster thumbnail
 * with a colored ring (date-coded) and a small pin tail — the signature SpotMo pin.
 */
export function posterPinIcon(event: SpotEvent, active: boolean): L.DivIcon {
  const color = BUCKET_COLOR[dateBucket(event.startsAt)];
  const size = active ? 60 : 48;
  const label = active ? relativeDayLabel(event.startsAt) : '';

  const html = `
    <div class="spotmo-pin-wrap" style="--pin:${color}; ${
      active ? 'transform: translateY(-4px) scale(1.06);' : ''
    }">
      ${
        label
          ? `<div class="spotmo-pin-label">${label}</div>`
          : ''
      }
      <div class="spotmo-pin-poster" style="width:${size}px;height:${size}px;border-color:${color};">
        <img src="${event.posterUrl}" loading="lazy" alt="" onerror="this.style.display='none';this.parentElement.style.background='${color}';" />
      </div>
      <div class="spotmo-pin-tail" style="border-top-color:${color};"></div>
    </div>
  `;

  return L.divIcon({
    className: 'spotmo-pin',
    html,
    iconSize: [size, size + 14],
    iconAnchor: [size / 2, size + 14],
    popupAnchor: [0, -size],
  });
}
