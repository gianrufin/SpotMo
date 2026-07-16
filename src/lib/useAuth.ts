import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from './supabase';

export interface AuthState {
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

/**
 * Supabase auth. When no project is configured, returns a disabled state so the
 * app keeps working in local mode.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(!isSupabaseEnabled);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Check admin membership (RLS lets a user read only their own admins row).
  useEffect(() => {
    if (!supabase || !session) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    supabase
      .from('admins')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsAdmin(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (!supabase) return 'Backend not configured.';
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      return error ? error.message : null;
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Backend not configured.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  return {
    enabled: isSupabaseEnabled,
    ready,
    session,
    email: session?.user.email ?? null,
    name: (session?.user.user_metadata?.name as string) ?? null,
    isAdmin,
    signUp,
    signIn,
    signOut,
  };
}
