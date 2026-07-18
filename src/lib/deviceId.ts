const KEY = 'spotmo.device_id';

/** Stable per-browser anonymous id, used only to dedupe this device's own
 * save/unsave toggles server-side (see useSavedEvents) — never sent anywhere
 * that ties it to a real identity. */
export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
