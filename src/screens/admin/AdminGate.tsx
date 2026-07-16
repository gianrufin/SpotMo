import { useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { PrimaryButton } from '../../components/common/PrimaryButton';

interface AdminGateProps {
  hasPin: boolean;
  onBack: () => void;
  onSetPin: (pin: string) => void;
  onUnlock: (pin: string) => boolean;
}

export function AdminGate({ hasPin, onBack, onSetPin, onUnlock }: AdminGateProps) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const setupMode = !hasPin;
  const canSubmit = setupMode
    ? pin.length >= 4 && pin === confirm
    : pin.length >= 4;

  function submit() {
    if (setupMode) {
      onSetPin(pin);
    } else if (!onUnlock(pin)) {
      setError('Incorrect PIN. Try again.');
      setPin('');
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
        <p className="font-serif text-xl text-ink">Admin access</p>
      </header>

      <div className="flex flex-1 flex-col px-6 pt-10">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brandsoft text-brand">
          {setupMode ? (
            <ShieldCheck size={26} strokeWidth={1.8} />
          ) : (
            <Lock size={24} strokeWidth={1.8} />
          )}
        </div>
        <h2 className="font-serif text-[26px] leading-tight text-ink">
          {setupMode ? 'Set your admin PIN' : 'Enter admin PIN'}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          {setupMode
            ? 'Only the admin can review, approve, or decline submitted events. Choose a PIN — you’ll need it each time you open the moderation queue.'
            : 'This area is restricted to the SpotMo admin.'}
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 8));
              setError('');
            }}
            placeholder="PIN (min 4 digits)"
            className="input text-center tracking-[0.3em]"
          />
          {setupMode && (
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Confirm PIN"
              className="input text-center tracking-[0.3em]"
            />
          )}
          {error && <p className="text-[13px] text-red-500">{error}</p>}
        </div>

        <div className="mt-6">
          <PrimaryButton full disabled={!canSubmit} onClick={submit}>
            {setupMode ? 'Set PIN & continue' : 'Unlock'}
          </PrimaryButton>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          Note: this is an on-device gate. Full admin-only enforcement across all
          users requires the backend (next phase).
        </p>
      </div>
    </div>
  );
}
