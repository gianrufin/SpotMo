import { supabase, isSupabaseEnabled } from './supabase';

const SESSION_KEY = 'spotmo.viewed_session';

function viewedThisSession(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/** Records one real view per event per browser session — reopening the same
 * event's detail sheet twice in one sitting shouldn't inflate the count. */
export function recordEventView(eventId: string): void {
  if (!isSupabaseEnabled || !supabase) return;
  const seen = viewedThisSession();
  if (seen.has(eventId)) return;
  seen.add(eventId);
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seen]));
  } catch {
    /* sessionStorage unavailable (e.g. private mode) — still record the view */
  }
  void supabase.rpc('increment_view_count', { p_event_id: eventId });
}
