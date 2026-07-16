import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { OrganizerRow } from './organizerTypes';

/**
 * The signed-in user's own row in the `organizers` roster (if any). On first
 * load after an approval, this auto-links the row to their new account
 * (user_id) and fills a default org name if the admin didn't set one —
 * so it works whether they just signed up or are signing back in later.
 */
export function useMyOrganizerProfile(session: Session | null) {
  const [profile, setProfile] = useState<OrganizerRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !session?.user.email) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Exact match on the lowercased email — avoid `ilike`, which treats `_`
    // and `%` in the email as wildcards and could match the wrong row.
    const { data } = await supabase
      .from('organizers')
      .select('*')
      .eq('email', session.user.email.toLowerCase())
      .maybeSingle();

    if (data && data.status === 'approved') {
      const patch: Record<string, unknown> = {};
      if (data.user_id !== session.user.id) patch.user_id = session.user.id;
      if (!data.org_name) {
        patch.org_name =
          (session.user.user_metadata?.name as string) || 'My Organization';
      }
      if (Object.keys(patch).length > 0) {
        const { data: updated } = await supabase
          .from('organizers')
          .update(patch)
          .eq('id', data.id)
          .select()
          .maybeSingle();
        setProfile((updated ?? data) as OrganizerRow);
        setLoading(false);
        return;
      }
    }
    setProfile((data as OrganizerRow) ?? null);
    setLoading(false);
  }, [session?.user?.id, session?.user?.email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live sync: the moment an admin approves/revokes this email, it reflects
  // here immediately — no need to sign out and back in or refresh.
  useEffect(() => {
    if (!supabase || !session?.user.email) return;
    const client = supabase;
    const email = session.user.email.toLowerCase();
    const channel = client
      .channel(`organizer-profile-${email}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organizers', filter: `email=eq.${email}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [session?.user?.email, refresh]);

  const updateOrgName = useCallback(
    async (orgName: string) => {
      if (!supabase || !profile) return;
      const { data } = await supabase
        .from('organizers')
        .update({ org_name: orgName.trim() || null })
        .eq('id', profile.id)
        .select()
        .maybeSingle();
      if (data) setProfile(data as OrganizerRow);
    },
    [profile],
  );

  return { profile, loading, refresh, updateOrgName };
}
