import { useState } from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { PrimaryButton } from '../../components/common/PrimaryButton';

interface OrganizerAuthProps {
  onBack: () => void;
  onSignUp: (name: string, email: string) => void;
}

export function OrganizerAuth({ onBack, onSignUp }: OrganizerAuthProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const valid = name.trim().length > 1 && /.+@.+\..+/.test(email);

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
        <p className="font-serif text-xl text-ink">Become an organizer</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-6">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brandsoft text-brand">
          <Store size={26} strokeWidth={1.8} />
        </div>
        <h2 className="font-serif text-[26px] leading-tight text-ink">
          List your events on SpotMo
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          Sign up as an organizer to submit gigs, shows, and markets. Every
          submission is reviewed by the SpotMo team before it goes live on the map.
        </p>

        <div className="mt-6 space-y-4">
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
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="input"
            />
          </label>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          By signing up you agree that submitted events are subject to review and
          may be declined or removed by the SpotMo admin.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-hairline bg-card/90 p-4 pb-5 backdrop-blur">
        <PrimaryButton
          full
          disabled={!valid}
          onClick={() => onSignUp(name, email)}
        >
          Create organizer account
        </PrimaryButton>
      </div>
    </div>
  );
}
