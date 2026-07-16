import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { OrganizerRow } from './organizerTypes';

/**
 * Admin-only roster management: view every request/organizer, approve,
 * reject, revoke, edit their name, add one directly, or delete outright.
 * All mutations are enforced server-side by the "admin manage organizers"
 * RLS policy — this hook is just a thin client over it.
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
    async (email: string, orgName: string) => {
      if (!supabase) return;
      await supabase.from('organizers').insert({
        email: email.trim().toLowerCase(),
        org_name: orgName.trim() || null,
        status: 'approved',
        created_by: 'admin',
        reviewed_at: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh],
  );

  const setStatus = useCallback(
    async (id: string, status: 'approved' | 'revoked') => {
      if (!supabase) return;
      await supabase
        .from('organizers')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const updateOrgName = useCallback(
    async (id: string, orgName: string) => {
      if (!supabase) return;
      await supabase
        .from('organizers')
        .update({ org_name: orgName.trim() || null })
        .eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) return;
      await supabase.from('organizers').delete().eq('id', id);
      await refresh();
    },
    [refresh],
  );

  return { organizers, refresh, addOrganizer, setStatus, updateOrgName, remove };
}
