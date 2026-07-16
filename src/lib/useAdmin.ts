import { useCallback, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Lightweight obfuscation — NOT real security. True admin-only enforcement
// requires a backend; this only gates casual access on the owner's device.
function encode(pin: string): string {
  return btoa(`spotmo::${pin}`);
}

/**
 * Owner/admin gate for the moderation queue. The owner sets a PIN once; after
 * that, reviewing/approving requires entering it. `unlocked` is session-only,
 * so the PIN is required again after the app is reopened.
 */
export function useAdmin() {
  const [hash, setHash] = useLocalStorage<string | null>('spotmo.admin.pin', null);
  const [unlocked, setUnlocked] = useState(false);

  const hasPin = !!hash;

  const setPin = useCallback(
    (pin: string) => {
      setHash(encode(pin));
      setUnlocked(true);
    },
    [setHash],
  );

  const unlock = useCallback(
    (pin: string): boolean => {
      if (hash && encode(pin) === hash) {
        setUnlocked(true);
        return true;
      }
      return false;
    },
    [hash],
  );

  const lock = useCallback(() => setUnlocked(false), []);

  return { hasPin, unlocked, setPin, unlock, lock };
}
