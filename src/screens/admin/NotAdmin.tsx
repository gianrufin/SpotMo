import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { PrimaryButton } from '../../components/common/PrimaryButton';

interface NotAdminProps {
  email: string | null;
  onBack: () => void;
  onSignOut: () => void;
}

export function NotAdmin({ email, onBack, onSignOut }: NotAdminProps) {
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
        <p className="font-serif text-xl text-ink">Admin access</p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
          <ShieldAlert size={26} strokeWidth={1.8} />
        </div>
        <h2 className="font-serif text-[26px] leading-tight text-ink">
          Not an admin account
        </h2>
        <p className="mt-2 max-w-[18rem] text-[14px] leading-relaxed text-muted">
          {email ? (
            <>
              You’re signed in as <span className="text-ink">{email}</span>, which
              isn’t on the admin allowlist. Sign in with the admin account to
              review submissions.
            </>
          ) : (
            'This account is not authorized to moderate events.'
          )}
        </p>
        <div className="mt-6 w-full max-w-xs space-y-3">
          <PrimaryButton full variant="soft" onClick={onSignOut}>
            Sign out
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
