import L from 'leaflet';
import type { SpotEvent } from '../../types';
import { BUCKET_COLOR, dateBucket } from '../../lib/format';

/**
 * Multiple events at the same venue collapse into one stacked-poster pin —
 * a couple of poster corners peeking out behind the front poster, plus a
 * count badge — instead of overlapping individual pins on top of each other.
 * Tapping it opens the venue's lineup sheet rather than a single event.
 */
export function venueStackIcon(events: SpotEvent[]): L.DivIcon {
  const front = events[0];
  const color = BUCKET_COLOR[dateBucket(front.startsAt)];
  const size = 48;

  const html = `
    <div class="spotmo-pin-wrap">
      <div class="spotmo-venue-stack" style="width:${size}px;height:${size}px;">
        <div class="spotmo-venue-stack-layer spotmo-venue-stack-layer-2" style="border-color:${color};"></div>
        <div class="spotmo-venue-stack-layer spotmo-venue-stack-layer-1" style="border-color:${color};"></div>
        <div class="spotmo-pin-poster" style="width:${size}px;height:${size}px;border-color:${color};">
          <img src="${front.posterUrl}" loading="lazy" alt="" onerror="this.style.display='none';this.parentElement.style.background='${color}';" />
        </div>
        <span class="spotmo-venue-stack-count">${events.length}</span>
      </div>
      <div class="spotmo-pin-tail" style="border-top-color:${color};"></div>
    </div>
  `;

  return L.divIcon({
    className: 'spotmo-pin',
    html,
    iconSize: [size, size + 14],
    iconAnchor: [size / 2, size + 14],
  });
}
