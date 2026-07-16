import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface Organizer {
  name: string;
  email: string;
  since: string;
}

/**
 * Client-side organizer identity. Persists a name + email so submissions are
 * attributed to the signed-up organizer. (Real, enforceable multi-user accounts
 * need a backend — this is a local prototype.)
 */
export function useOrganizer() {
  const [organizer, setOrganizer] = useLocalStorage<Organizer | null>(
    'spotmo.organizer',
    null,
  );

  const signUp = useCallback(
    (name: string, email: string) => {
      setOrganizer({
        name: name.trim(),
        email: email.trim(),
        since: new Date().toISOString(),
      });
    },
    [setOrganizer],
  );

  const signOut = useCallback(() => setOrganizer(null), [setOrganizer]);

  return { organizer, signUp, signOut };
}
