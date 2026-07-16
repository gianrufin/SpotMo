import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const KEY = 'spotmo.onboarded';

export function useOnboarding() {
  const [seen, setSeen] = useLocalStorage<boolean>(KEY, false);
  const complete = useCallback(() => setSeen(true), [setSeen]);
  const reset = useCallback(() => setSeen(false), [setSeen]);
  return { seen, complete, reset };
}
