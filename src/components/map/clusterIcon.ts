import L from 'leaflet';

/** Emerald circular cluster badge sized by how many events it groups. */
export function clusterIcon(count: number): L.DivIcon {
  const size = count >= 25 ? 58 : count >= 10 ? 52 : 46;
  const html = `
    <div class="spotmo-cluster" style="width:${size}px;height:${size}px;">
      <span>${count}</span>
    </div>`;
  return L.divIcon({
    className: 'spotmo-pin',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
