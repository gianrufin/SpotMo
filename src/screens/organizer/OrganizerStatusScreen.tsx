import { useState } from 'react';
import { ArrowLeft, Clock, ShieldAlert, Store, Instagram } from 'lucide-react';
import { PrimaryButton } from '../../components/common/PrimaryButton';

interface OrganizerStatusScreenProps {
  status: 'pending' | 'revoked' | 'not-requested';
  email: string | null;
  onBack: () => void;
  onSignOut: () => void;
  /** Only provided for 'not-requested' — submits a request for the signed-in
   * email, plus a required social link (see RequestAccess for why). */
  onRequestNow?: (social: string) => Promise<{ ok: boolean; error?: string }>;
}

const COPY = {
  pending: {
    icon: Clock,
    title: 'Request pending',
    message: 'Your organizer request is awaiting admin review. Check back once you’ve been notified.',
  },
  revoked: {
    icon: ShieldAlert,
    title: 'Access revoked',
    message: 'Your organizer access has been revoked. Contact the admin if you think this is a mistake.',
  },
  'not-requested': {
    icon: Store,
    title: 'Request organizer access',
    message: 'You haven’t requested organizer access yet. Send a request and we’ll review it.',
  },
} as const;

export function OrganizerStatusScreen({
  status,
  email,
  onBack,
  onSignOut,
  onRequestNow,
}: OrganizerStatusScreenProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [social, setSocial] = useState('');
  const { icon: Icon, title, message } = COPY[status];

  async function handleRequest() {
    if (!onRequestNow) return;
    const trimmed = social.trim();
    if (!trimmed || /\s/.test(trimmed)) {
      setError('Add a link (or @handle) to your Instagram or Facebook page.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await onRequestNow(trimmed);
    setBusy(false);
    if (result.ok) setSent(true);
    else setError(result.error ?? 'Something went wrong.');
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft size={19} strokeWidth={1.9} />
        </button>
        <p className="font-serif text-xl text-ink">Organizer access</p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
          <Icon size={26} strokeWidth={1.8} />
        </div>
        <h2 className="font-serif text-[26px] leading-tight text-ink">
          {sent ? 'Request sent' : title}
        </h2>
        <p className="mt-2 max-w-[18rem] text-[14px] leading-relaxed text-muted">
          {sent
            ? 'Your request is now awaiting admin review.'
            : email
              ? `${message} (${email})`
              : message}
        </p>
        {status === 'not-requested' && !sent && (
          <label className="mt-5 block w-full max-w-xs text-left">
            <span className="mb-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
              <Instagram size={13} strokeWidth={1.9} /> Instagram or Facebook link
            </span>
            <input
              autoCapitalize="none"
              value={social}
              onChange={(e) => setSocial(e.target.value)}
              placeholder="instagram.com/yourpage or @yourhandle"
              className="input"
            />
          </label>
        )}
        {error && <p className="mt-2 text-[13px] text-red-500">{error}</p>}

        <div className="mt-6 w-full max-w-xs space-y-3">
          {status === 'not-requested' && !sent && (
            <PrimaryButton full disabled={busy} onClick={handleRequest}>
              {busy ? 'Sending…' : 'Send request'}
            </PrimaryButton>
          )}
          <PrimaryButton full variant="soft" onClick={onSignOut}>
            Sign out
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
