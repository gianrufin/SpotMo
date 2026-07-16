import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SpotEvent } from '../types';
import { hasEventEnded } from './format';
import { useLocalStorage } from './useLocalStorage';

const SOON_WINDOW_MS = 2 * 3600_000; // "starting soon" list: within 2 hours
const NOTIFY_WINDOW_MS = 30 * 60_000; // fire the actual notification: within 30 min

/**
 * Local, no-account reminders for saved events — same spirit as Saved itself
 * (device-local, no backend). Two layers:
 * - `startingSoon`: always-on in-app list, fully reliable.
 * - Browser notifications: best-effort, and only fire while the app/tab is
 *   open (there's no push server), so we're upfront that this isn't a true
 *   background reminder — just a nice bonus when you happen to have it open.
 */
export function useSavedReminders(savedEvents: SpotEvent[]) {
  const [enabled, setEnabled] = useLocalStorage<boolean>('spotmo.reminders.enabled', false);
  const [notifiedIds, setNotifiedIds] = useLocalStorage<string[]>('spotmo.reminders.notified', []);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const startingSoon = useMemo(
    () =>
      savedEvents
        .filter((e) => !hasEventEnded(e))
        .filter((e) => new Date(e.startsAt).getTime() - now <= SOON_WINDOW_MS)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [savedEvents, now],
  );

  const canNotify = typeof window !== 'undefined' && 'Notification' in window;

  const enableReminders = useCallback(async (): Promise<boolean> => {
    if (!canNotify) return false;
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setEnabled(granted);
    return granted;
  }, [canNotify, setEnabled]);

  const disableReminders = useCallback(() => setEnabled(false), [setEnabled]);

  useEffect(() => {
    if (!enabled || !canNotify || Notification.permission !== 'granted') return;
    for (const e of savedEvents) {
      if (notifiedIds.includes(e.id)) continue;
      const untilStart = new Date(e.startsAt).getTime() - now;
      if (untilStart > 0 && untilStart <= NOTIFY_WINDOW_MS) {
        new Notification(`Starting soon: ${e.title}`, {
          body: `${e.venue} — starts in about ${Math.max(1, Math.round(untilStart / 60_000))} min`,
          tag: e.id,
        });
        setNotifiedIds((prev) => [...prev, e.id]);
      }
    }
  }, [enabled, canNotify, savedEvents, now, notifiedIds, setNotifiedIds]);

  return { startingSoon, enabled, canNotify, enableReminders, disableReminders };
}
