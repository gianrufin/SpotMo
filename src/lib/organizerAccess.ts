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

/** Public: submit a request for organizer access — email, a required social
 * link (their strongest signal of being a real organizer/venue/production —
 * see the admin queue, which shows this as a clickable link to check before
 * approving), and an optional note on what they'd be listing. */
export async function requestOrganizerAccess(
  email: string,
  socialUrl: string,
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Backend not configured.' };
  const { error } = await supabase.from('organizers').insert({
    email: email.trim().toLowerCase(),
    status: 'pending',
    created_by: 'request',
    request_note: note?.trim() || null,
    instagram_url: socialUrl.trim(),
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

/** Turns whatever an organizer typed (a bare handle, "@handle", a link
 * without "https://", or a full URL) into a clickable href — so the admin
 * queue can link out no matter how it was entered, in the request form or
 * the older freeform organizer-dashboard field. Defaults bare handles to
 * Instagram, the dominant platform for this use case. */
export function toSocialHref(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/\.[a-z]{2,}\//.test(trimmed) || /\.[a-z]{2,}$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  const handle = trimmed.replace(/^@/, '');
  return `https://instagram.com/${handle}`;
}
