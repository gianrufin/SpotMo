import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { supabase, isSupabaseEnabled } from './supabase';
import { getDeviceId } from './deviceId';

const KEY = 'spotmo.saved';

export function useSavedEvents() {
  const [ids, setIds] = useLocalStorage<string[]>(KEY, []);

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
