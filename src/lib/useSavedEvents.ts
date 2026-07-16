import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const KEY = 'spotmo.saved';

export function useSavedEvents() {
  const [ids, setIds] = useLocalStorage<string[]>(KEY, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev],
      );
    },
    [setIds],
  );

  return { savedIds: ids, isSaved, toggle };
}
