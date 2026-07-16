import { useState } from 'react';
import { ArrowLeft, Store, ShieldCheck } from 'lucide-react';
import { PrimaryButton } from '../../components/common/PrimaryButton';

interface AuthPanelProps {
  variant: 'organizer' | 'admin';
  onBack: () => void;
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (name: string, email: string, password: string) => Promise<string | null>;
}

export function AuthPanel({ variant, onBack, onSignIn, onSignUp }: AuthPanelProps) {
  // Admins only ever sign in; organizers can sign up or sign in.
  const [mode, setMode] = useState<'in' | 'up'>(variant === 'admin' ? 'in' : 'up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isAdmin = variant === 'admin';
  const valid =
    /.+@.+\..+/.test(email) &&
    password.length >= 6 &&
    (mode === 'in' || name.trim().length > 1);

  async function submit() {
    setBusy(true);
    setError('');
    setNotice('');
    const err =
      mode === 'up'
        ? await onSignUp(name.trim(), email.trim(), password)
        : await onSignIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err);
    } else if (mode === 'up') {
      // If email confirmation is on, the session won't exist yet.
      setNotice('Account created. If asked, confirm via the email we sent, then sign in.');
      setMode('in');
    }
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
        <p className="font-serif text-xl text-ink">
          {isAdmin ? 'Admin sign in' : 'Organizer access'}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-28 pt-8">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brandsoft text-brand">
          {isAdmin ? (
            <ShieldCheck size={26} strokeWidth={1.8} />
          ) : (
            <Store size={26} strokeWidth={1.8} />
          )}
        </div>
        <h2 className="font-serif text-[26px] leading-tight text-ink">
          {isAdmin
            ? 'Sign in to moderate events'
            : mode === 'up'
              ? 'List your events on SpotMo'
              : 'Welcome back'}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          {isAdmin
            ? 'Only the admin account can approve, decline, or review submissions.'
            : 'Sign up to submit gigs, shows, and markets. Every submission is reviewed before it goes live.'}
        </p>

        <div className="mt-6 space-y-3.5">
          {mode === 'up' && !isAdmin && (
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] text-muted">
                Organizer / venue name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. saGuijo Presents"
                className="input"
              />
            </label>
          )}
          <label className="block">
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
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-muted">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input"
            />
          </label>
          {error && <p className="text-[13px] text-red-500">{error}</p>}
          {notice && <p className="text-[13px] text-brand">{notice}</p>}
        </div>

        <div className="mt-6">
          <PrimaryButton full disabled={!valid || busy} onClick={submit}>
            {busy
              ? 'Please wait…'
              : mode === 'up'
                ? 'Create account'
                : 'Sign in'}
          </PrimaryButton>
        </div>

        {!isAdmin && (
          <button
            onClick={() => {
              setMode((m) => (m === 'up' ? 'in' : 'up'));
              setError('');
              setNotice('');
            }}
            className="mt-4 w-full text-center text-[13.5px] text-muted"
          >
            {mode === 'up'
              ? 'Already have an account? Sign in'
              : 'New here? Create an organizer account'}
          </button>
        )}
      </div>
    </div>
  );
}
