import { supabase } from './supabase';
import type { OrganizerStatusCheck } from './organizerTypes';

/** Public: check whether an email has requested/been approved — no auth needed. */
export async function checkOrganizerStatus(
  email: string,
): Promise<OrganizerStatusCheck> {
  if (!supabase) return { status: 'none', has_account: false };
  const { data, error } = await supabase.rpc('check_organizer_status', {
    p_email: email.trim().toLowerCase(),
  });
  if (error || !data) return { status: 'none', has_account: false };
  return data as OrganizerStatusCheck;
}

/** Public: submit a request for organizer access — email plus an optional
 * note on what they'd be listing, so the admin has context to approve on. */
export async function requestOrganizerAccess(
  email: string,
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Backend not configured.' };
  const { error } = await supabase.from('organizers').insert({
    email: email.trim().toLowerCase(),
    status: 'pending',
    created_by: 'request',
    request_note: note?.trim() || null,
  });
  if (error) {
    const dup = error.code === '23505';
    return {
      ok: false,
      error: dup
        ? 'A request for this email already exists.'
        : error.message,
    };
  }
  return { ok: true };
}
