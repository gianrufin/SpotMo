import { useCallback, useEffect, useState } from 'react';

/** Generic localStorage-backed state with cross-tab/component sync. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / private mode errors */
    }
  }, [key, value]);

  // keep multiple hook instances (e.g. different screens) in sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === key && e.newValue) {
        try {
          setValue(JSON.parse(e.newValue) as T);
        } catch {
          /* ignore */
        }
      }
    }
    function onCustom(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === key) setValue(detail.value as T);
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('spotmo:storage', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('spotmo:storage', onCustom as EventListener);
    };
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        // broadcast to sibling hooks in the same tab
        window.dispatchEvent(
          new CustomEvent('spotmo:storage', {
            detail: { key, value: resolved },
          }),
        );
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}
