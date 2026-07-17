import { useCallback, useEffect } from 'react';
import { supabase } from './supabase';
import { useLocalStorage } from './useLocalStorage';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Best-effort phone notifications for admins: a new event submission or a
 * new organizer request fires a browser Notification while the app is open.
 * Same honest limitation as saved-event reminders — there's no push server,
 * so this only fires while the app/tab happens to be open.
 */
export function useAdminNotifications(isAdmin: boolean) {
  const [enabled, setEnabled] = useLocalStorage<boolean>(
    'spotmo.adminNotifications.enabled',
    false,
  );
  const canNotify = typeof window !== 'undefined' && 'Notification' in window;

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!canNotify) return false;
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setEnabled(granted);
    return granted;
  }, [canNotify, setEnabled]);

  const disableNotifications = useCallback(() => setEnabled(false), [setEnabled]);

  useEffect(() => {
    if (!supabase || !isAdmin || !enabled || !canNotify) return;
    if (Notification.permission !== 'granted') return;
    const client = supabase;

    const eventsChannel = client
      .channel('admin-notify-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload: any) => {
          const row = payload.new;
          if (row?.status === 'pending') {
            new Notification('New event submitted', {
              body: `${row.title} — awaiting your review`,
              tag: `event-${row.id}`,
            });
          }
        },
      )
      .subscribe();

    const organizersChannel = client
      .channel('admin-notify-organizers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'organizers' },
        (payload: any) => {
          const row = payload.new;
          if (row?.status === 'pending') {
            new Notification('New organizer request', {
              body: `${row.email} wants to become an organizer`,
              tag: `organizer-${row.id}`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(eventsChannel);
      void client.removeChannel(organizersChannel);
    };
  }, [isAdmin, enabled, canNotify]);

  return { enabled, canNotify, enableNotifications, disableNotifications };
}
