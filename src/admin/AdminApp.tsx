import { useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { useTheme } from '../lib/useTheme';
import { isSupabaseEnabled } from '../lib/supabase';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { Dashboard } from './Dashboard';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.15),0_8px_24px_-4px_rgba(0,0,0,0.2)]">
        {children}
      </div>
    </div>
  );
}

function SignInForm({
  onSignIn,
}: {
  onSignIn: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const err = await onSignIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Centered>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brandsoft text-brandsoftfg">
        <ShieldCheck size={26} strokeWidth={1.8} />
      </div>
      <h1 className="text-[22px] font-medium text-ink">SpotMo Admin</h1>
      <p className="mt-1 text-[13.5px] text-muted">Sign in with your admin account.</p>
      <form onSubmit={submit} className="mt-6 space-y-3 text-left">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] text-muted">Email</span>
          <input
            type="email"
            autoFocus
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
            placeholder="••••••••"
            className="input"
          />
        </label>
        {error && <p className="text-[13px] text-red-500">{error}</p>}
        <PrimaryButton full disabled={busy || !email || !password} type="submit">
          {busy ? 'Please wait…' : 'Sign in'}
        </PrimaryButton>
      </form>
    </Centered>
  );
}

export function AdminApp() {
  const auth = useAuth();
  const theme = useTheme();

  if (!isSupabaseEnabled) {
    return (
      <Centered>
        <p className="text-[15px] text-ink">Backend not configured.</p>
        <p className="mt-1 text-[13px] text-muted">
          Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to enable the admin dashboard.
        </p>
      </Centered>
    );
  }

  if (!auth.ready) return null;

  if (!auth.session) {
    return <SignInForm onSignIn={auth.signIn} />;
  }

  if (!auth.isAdmin) {
    return (
      <Centered>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted">
          <ShieldAlert size={26} strokeWidth={1.8} />
        </div>
        <h1 className="text-[19px] font-medium text-ink">Not an admin account</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          Signed in as <span className="text-ink">{auth.email}</span>, which isn’t on
          the admin allowlist.
        </p>
        <div className="mt-5">
          <PrimaryButton full variant="soft" onClick={() => void auth.signOut()}>
            Sign out
          </PrimaryButton>
        </div>
      </Centered>
    );
  }

  return (
    <Dashboard
      session={auth.session}
      email={auth.email}
      dark={theme.isDark}
      onToggleTheme={() => theme.setPref(theme.isDark ? 'light' : 'dark')}
      onSignOut={() => void auth.signOut()}
    />
  );
}
