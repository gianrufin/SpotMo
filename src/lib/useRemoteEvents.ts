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
    organizerInstagram: r.organizer_instagram ?? undefined,
    viewCount: r.view_count ?? 0,
    saveCount: r.save_count ?? 0,
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
  if (e.organizerInstagram !== undefined) row.organizer_instagram = e.organizerInstagram;
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    let firstError: string | null = null;

    const { data: appr, error: apprError } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .order('starts_at', { ascending: true });
    if (apprError) {
      console.error('Failed to load approved events:', apprError);
      firstError ??= apprError.message;
    }
    setApproved((appr ?? []).map(rowToEvent));

    if (session) {
      const { data: own, error: ownError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', session.user.id)
        .order('created_at', { ascending: false });
      if (ownError) {
        console.error('Failed to load your events:', ownError);
        firstError ??= ownError.message;
      }
      setMine((own ?? []).map(rowToSubmission));
    } else {
      setMine([]);
    }

    if (isAdmin) {
      const { data: everything, error: allError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (allError) {
        console.error('Failed to load all events:', allError);
        firstError ??= allError.message;
      }
      setAll((everything ?? []).map(rowToSubmission));
    } else {
      setAll([]);
    }

    setLoadError(firstError);
    setLoading(false);
  }, [session?.user?.id, isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live sync: anyone with the app open sees approvals/edits/new submissions
  // instantly, without a manual refresh.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refresh]);

  const add = useCallback(
    async (
      event: SpotEvent,
      name: string,
      instagram?: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase || !session) return { ok: false, error: 'Not signed in.' };
      const { error } = await supabase.from('events').insert({
        ...eventToRow(event),
        organizer: name,
        organizer_instagram: instagram ?? null,
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
    async (id: string, status: SubmissionStatus): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      const { error } = await supabase.from('events').update({ status }).eq('id', id);
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      const { error } = await supabase.from('events').delete().eq('id', id);
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<SpotEvent>): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      const { error } = await supabase.from('events').update(eventToRow(patch)).eq('id', id);
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  const bulkSetStatus = useCallback(
    async (ids: string[], status: SubmissionStatus): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      if (ids.length === 0) return { ok: true };
      const { error } = await supabase.from('events').update({ status }).in('id', ids);
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  const bulkRemove = useCallback(
    async (ids: string[]): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      if (ids.length === 0) return { ok: true };
      const { error } = await supabase.from('events').delete().in('id', ids);
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  return {
    approved,
    mine,
    all,
    loading,
    loadError,
    add,
    setStatus,
    remove,
    update,
    bulkSetStatus,
    bulkRemove,
    refresh,
  };
}
