import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ThemePref = 'light' | 'dark' | 'system';

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
}

/**
 * Theme preference (light / dark / system) persisted to localStorage.
 * Toggles the `dark` class on <html> and updates the browser theme-color so
 * every screen — and the mobile status bar — matches the active theme.
 */
export function useTheme() {
  const [pref, setPref] = useLocalStorage<ThemePref>('spotmo.theme', 'system');
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark = pref === 'system' ? systemDark : pref === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0F1318' : '#2F7D5A');
  }, [isDark]);

  const cycle = useCallback(() => {
    setPref((p) => (p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light'));
  }, [setPref]);

  return { pref, setPref, isDark, cycle };
}
