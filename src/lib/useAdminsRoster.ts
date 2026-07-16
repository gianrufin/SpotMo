import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface AdminRow {
  id: string;
  created_at: string;
}

type Result = { ok: boolean; error?: string };

/**
 * The full admin roster (visible to admins only) plus promote/demote. The
 * founding admin (earliest `created_at`) and your own account can never be
 * demoted through this hook — enforced here for a clear error message, and
 * again server-side by RLS as the real guarantee.
 */
export function useAdminsRoster(isAdmin: boolean, currentUserId: string | null) {
  const [admins, setAdmins] = useState<AdminRow[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase || !isAdmin) {
      setAdmins([]);
      return;
    }
    const { data } = await supabase
      .from('admins')
      .select('id, created_at')
      .order('created_at', { ascending: true });
    setAdmins((data ?? []) as AdminRow[]);
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !isAdmin) return;
    const client = supabase;
    const channel = client
      .channel('admins-roster-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admins' },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [isAdmin, refresh]);

  const adminIds = new Set(admins.map((a) => a.id));
  const founderId = admins[0]?.id ?? null;

  const promote = useCallback(
    async (userId: string): Promise<Result> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      const { error } = await supabase.from('admins').insert({ id: userId });
      await refresh();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [refresh],
  );

  const demote = useCallback(
    async (userId: string): Promise<Result> => {
      if (!supabase) return { ok: false, error: 'Backend not configured.' };
      if (userId === currentUserId) {
        return { ok: false, error: "You can't remove your own admin access." };
      }
      if (userId === founderId) {
        return { ok: false, error: "The founding admin can't be removed." };
      }
      const { data, error } = await supabase
        .from('admins')
        .delete()
        .eq('id', userId)
        .select();
      await refresh();
      if (error) return { ok: false, error: error.message };
      if (!data || data.length === 0) {
        return { ok: false, error: "Couldn't remove admin access — no matching row." };
      }
      return { ok: true };
    },
    [refresh, currentUserId, founderId],
  );

  function canDemote(userId: string): boolean {
    return adminIds.has(userId) && userId !== currentUserId && userId !== founderId;
  }

  return { admins, adminIds, founderId, refresh, promote, demote, canDemote };
}
