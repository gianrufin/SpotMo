import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { SpotEvent, Submission, SubmissionStatus } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToEvent(r: any): SpotEvent {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    posterUrl: r.poster_url ?? '',
    lat: r.lat,
    lng: r.lng,
    venue: r.venue,
    address: r.address ?? '',
    city: r.city ?? '',
    startsAt: r.starts_at,
    endsAt: r.ends_at ?? undefined,
    priceLabel: r.price_label ?? 'Free',
    isFree: r.is_free,
    description: r.description ?? '',
    lineup: r.lineup ?? undefined,
    highlights: r.highlights ?? undefined,
    ticketUrl: r.ticket_url ?? undefined,
    organizer: r.organizer ?? undefined,
  };
}

function rowToSubmission(r: any): Submission {
  return {
    ...rowToEvent(r),
    status: r.status,
    submittedAt: r.created_at,
    submittedBy: r.organizer ?? '',
  };
}

function eventToRow(e: Partial<SpotEvent>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (e.title !== undefined) row.title = e.title;
  if (e.category !== undefined) row.category = e.category;
  if (e.posterUrl !== undefined) row.poster_url = e.posterUrl;
  if (e.lat !== undefined) row.lat = e.lat;
  if (e.lng !== undefined) row.lng = e.lng;
  if (e.venue !== undefined) row.venue = e.venue;
  if (e.address !== undefined) row.address = e.address;
  if (e.city !== undefined) row.city = e.city;
  if (e.startsAt !== undefined) row.starts_at = e.startsAt;
  if (e.endsAt !== undefined) row.ends_at = e.endsAt;
  if (e.priceLabel !== undefined) row.price_label = e.priceLabel;
  if (e.isFree !== undefined) row.is_free = e.isFree;
  if (e.description !== undefined) row.description = e.description;
  if (e.lineup !== undefined) row.lineup = e.lineup;
  if (e.highlights !== undefined) row.highlights = e.highlights;
  if (e.ticketUrl !== undefined) row.ticket_url = e.ticketUrl;
  if (e.organizer !== undefined) row.organizer = e.organizer;
  return row;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Supabase-backed events. `approved` is public (for the map); `mine` is the
 * signed-in organizer's submissions; `all` is populated for admins (RLS returns
 * everything only to admins). Mutations refetch to stay consistent.
 */
export function useRemoteEvents(session: Session | null, isAdmin: boolean) {
  const [approved, setApproved] = useState<SpotEvent[]>([]);
  const [mine, setMine] = useState<Submission[]>([]);
  const [all, setAll] = useState<Submission[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data: appr } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .order('starts_at', { ascending: true });
    setApproved((appr ?? []).map(rowToEvent));

    if (session) {
      const { data: own } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', session.user.id)
        .order('created_at', { ascending: false });
      setMine((own ?? []).map(rowToSubmission));
    } else {
      setMine([]);
    }

    if (isAdmin) {
      const { data: everything } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      setAll((everything ?? []).map(rowToSubmission));
    } else {
      setAll([]);
    }
  }, [session?.user?.id, isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (
      event: SpotEvent,
      name: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase || !session) return { ok: false, error: 'Not signed in.' };
      const { error } = await supabase.from('events').insert({
        ...eventToRow(event),
        organizer: name,
        organizer_id: session.user.id,
        status: 'pending',
      });
      await refresh();
      if (error) {
        // RLS blocks this insert until the organizer's account is approved.
        const notApproved = error.code === '42501';
        return {
          ok: false,
          error: notApproved
            ? 'Your organizer account isn’t approved yet. Please wait for admin approval.'
            : error.message,
        };
      }
      return { ok: true };
    },
    [session, refresh],
  );

  const setStatus = useCallback(
    async (id: string, status: SubmissionStatus) => {
      if (!supabase) return;
      await supabase.from('events').update({ status }).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) return;
      await supabase.from('events').delete().eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<SpotEvent>) => {
      if (!supabase) return;
      await supabase.from('events').update(eventToRow(patch)).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  return { approved, mine, all, add, setStatus, remove, update, refresh };
}
