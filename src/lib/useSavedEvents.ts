import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { supabase, isSupabaseEnabled } from './supabase';
import { getDeviceId } from './deviceId';

const KEY = 'spotmo.saved';

export function useSavedEvents() {
  const [ids, setIds] = useLocalStorage<string[]>(KEY, []);

  // Reconcile with this device's server-side save record on load. Two
  // directions: pull in anything the server has that localStorage lost
  // (e.g. after a partial storage clear that spared the device id), and
  // backfill anything saved locally before this per-device mirror existed,
  // so save_count catches up to reflect it too.
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const client = supabase;
    const deviceId = getDeviceId();
    client
      .from('event_saves')
      .select('event_id')
      .eq('device_id', deviceId)
      .then(({ data }) => {
        if (!data) return;
        const serverIds = data.map((r) => r.event_id as string);
        setIds((prev) => {
          const missing = prev.filter((id) => !serverIds.includes(id));
          if (missing.length > 0) {
            void client
              .from('event_saves')
              .upsert(
                missing.map((event_id) => ({ event_id, device_id: deviceId })),
                { onConflict: 'event_id,device_id', ignoreDuplicates: true },
              );
          }
          return Array.from(new Set([...prev, ...serverIds]));
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      const nowSaved = !ids.includes(id);
      setIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev],
      );
      // Mirror to a per-device row so save_count reflects real, de-duplicated
      // saves across everyone using the app, not just this browser's list.
      if (isSupabaseEnabled && supabase) {
        const deviceId = getDeviceId();
        if (nowSaved) {
          void supabase
            .from('event_saves')
            .upsert(
              { event_id: id, device_id: deviceId },
              { onConflict: 'event_id,device_id', ignoreDuplicates: true },
            );
        } else {
          void supabase
            .from('event_saves')
            .delete()
            .eq('event_id', id)
            .eq('device_id', deviceId);
        }
      }
    },
    [ids, setIds],
  );

  return { savedIds: ids, isSaved, toggle };
}
