import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { OrganizerRow } from './organizerTypes';

type Result = { ok: boolean; error?: string };

/**
 * Admin-only roster management: view every request/organizer, approve,
 * reject, revoke, edit their name, add one directly, or delete outright.
 * All mutations are enforced server-side by the "admin manage organizers"
 * RLS policy — this hook is just a thin client over it. Every mutation
 * surfaces its real Supabase error (e.g. RLS denial) instead of swallowing
 * it, since a silent no-op there is indistinguishable from "it worked."
 */
export function useOrganizersAdmin(isAdmin: boolean) {
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase || !isAdmin) {
      setOrganizers([]);
      return;
    }
    const { data } = await supabase
      .from('organizers')
      .select('*')
      .order('requested_at', { ascending: false });
    setOrganizers((data ?? []) as OrganizerRow[]);
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addOrganizer = useCallback(
    async (email: string, orgName: string): Promise<Result> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      const { error } = await supabase.from('organizers').insert({
        email: email.trim().toLowerCase(),
        org_name: orgName.trim() || null,
        status: 'approved',
        created_by: 'admin',
        reviewed_at: new Date().toISOString(),
      });
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  const setStatus = useCallback(
    async (id: string, status: 'approved' | 'revoked'): Promise<Result> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      const { error } = await supabase
        .from('organizers')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  const updateOrgName = useCallback(
    async (id: string, orgName: string): Promise<Result> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      const { error } = await supabase
        .from('organizers')
        .update({ org_name: orgName.trim() || null })
        .eq('id', id);
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<Result> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      const { error } = await supabase.from('organizers').delete().eq('id', id);
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  return { organizers, refresh, addOrganizer, setStatus, updateOrgName, remove };
}
