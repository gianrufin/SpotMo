import { useState } from 'react';
import { ArrowLeft, Store, Clock, ShieldAlert } from 'lucide-react';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { AuthPanel } from '../auth/AuthPanel';
import { checkOrganizerStatus, requestOrganizerAccess } from '../../lib/organizerAccess';
import type { AuthState } from '../../lib/useAuth';

interface RequestAccessProps {
  onBack: () => void;
  onSignIn: AuthState['signIn'];
  onSignUp: AuthState['signUp'];
}

type Phase =
  | { kind: 'form' }
  | { kind: 'checking' }
  | { kind: 'confirm-request'; email: string; note: string }
  | { kind: 'pending'; email: string }
  | { kind: 'revoked'; email: string }
  | { kind: 'approved'; email: string; hasAccount: boolean };

/**
 * Public entry point for prospective organizers: submit just an email,
 * see its status, and — once the admin has approved it — finish creating
 * a real account. Nothing here can self-approve; that's admin-only.
 */
export function RequestAccess({ onBack, onSignIn, onSignUp }: RequestAccessProps) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [error, setError] = useState('');

  async function checkAndContinue() {
    const trimmed = email.trim();
    if (!/.+@.+\..+/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setPhase({ kind: 'checking' });
    const result = await checkOrganizerStatus(trimmed);
    if (result.status === 'none') {
      setPhase({ kind: 'confirm-request', email: trimmed, note });
    } else if (result.status === 'pending') {
      setPhase({ kind: 'pending', email: trimmed });
    } else if (result.status === 'revoked') {
      setPhase({ kind: 'revoked', email: trimmed });
    } else {
      setPhase({ kind: 'approved', email: trimmed, hasAccount: result.has_account });
    }
  }

  async function submitRequest(targetEmail: string, targetNote: string) {
    setPhase({ kind: 'checking' });
    const result = await requestOrganizerAccess(targetEmail, targetNote);
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      setPhase({ kind: 'form' });
      return;
    }
    setPhase({ kind: 'pending', email: targetEmail });
  }

  function reset() {
    setError('');
    setPhase({ kind: 'form' });
  }

  if (phase.kind === 'approved') {
    return (
      <AuthPanel
        variant="organizer"
        onBack={onBack}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        initialEmail={phase.email}
        initialMode={phase.hasAccount ? 'in' : 'up'}
        lockEmail
        onChangeEmail={reset}
      />
    );
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
        <p className="font-serif text-xl text-ink">Want to be an organizer?</p>
      </header>

      <div className="flex flex-1 flex-col px-6 pt-8">
        {(phase.kind === 'form' || phase.kind === 'checking') && (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brandsoft text-brand">
              <Store size={26} strokeWidth={1.8} />
            </div>
            <h2 className="font-serif text-[26px] leading-tight text-ink">
              Want to be an organizer?
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Enter your email. We'll review your request, and you'll create
              your account once it's approved.
            </p>
            <label className="mt-6 block">
              <span className="mb-1.5 block text-[12.5px] text-muted">Email</span>
              <input
                type="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="input"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[12.5px] text-muted">
                What will you be listing events for? (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. saGuijo Presents — indie gigs around Poblacion"
                rows={3}
                className="input resize-none"
              />
            </label>
            {error && <p className="mt-2 text-[13px] text-red-500">{error}</p>}
            <div className="mt-6">
              <PrimaryButton
                full
                disabled={phase.kind === 'checking'}
                onClick={checkAndContinue}
              >
                {phase.kind === 'checking' ? 'Checking…' : 'Continue'}
              </PrimaryButton>
            </div>
          </>
        )}

        {phase.kind === 'confirm-request' && (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brandsoft text-brand">
              <Store size={26} strokeWidth={1.8} />
            </div>
            <h2 className="font-serif text-[26px] leading-tight text-ink">
              Send this request?
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              We'll ask the admin to approve organizer access for{' '}
              <span className="text-ink">{phase.email}</span>.
            </p>
            <div className="mt-6 space-y-3">
              <PrimaryButton full onClick={() => submitRequest(phase.email, phase.note)}>
                Send request
              </PrimaryButton>
              <button onClick={reset} className="w-full py-2 text-[14px] text-muted">
                Use a different email
              </button>
            </div>
          </>
        )}

        {phase.kind === 'pending' && (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
              <Clock size={26} strokeWidth={1.8} />
            </div>
            <h2 className="font-serif text-[26px] leading-tight text-ink">
              Request pending
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Your request for <span className="text-ink">{phase.email}</span> is
              awaiting admin review. Check back once you've been notified.
            </p>
            <div className="mt-6">
              <PrimaryButton full variant="soft" onClick={reset}>
                Check a different email
              </PrimaryButton>
            </div>
          </>
        )}

        {phase.kind === 'revoked' && (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
              <ShieldAlert size={26} strokeWidth={1.8} />
            </div>
            <h2 className="font-serif text-[26px] leading-tight text-ink">
              Access revoked
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Organizer access for <span className="text-ink">{phase.email}</span>{' '}
              has been revoked. Contact the admin if you think this is a mistake.
            </p>
            <div className="mt-6">
              <PrimaryButton full variant="soft" onClick={reset}>
                Check a different email
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
