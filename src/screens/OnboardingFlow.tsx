import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { PrimaryButton } from '../components/common/PrimaryButton';

interface OnboardingFlowProps {
  onDone: () => void;
  onAllowLocation: () => void;
}

type Step = 'splash' | 'welcome' | 'location';

export function OnboardingFlow({ onDone, onAllowLocation }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('splash');

  // auto-advance splash
  if (step === 'splash') {
    setTimeout(() => setStep((s) => (s === 'splash' ? 'welcome' : s)), 1900);
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-white">
      <AnimatePresence mode="wait">
        {step === 'splash' && <SplashStep key="splash" />}
        {step === 'welcome' && (
          <WelcomeStep
            key="welcome"
            onNext={() => setStep('location')}
            onSkip={onDone}
          />
        )}
        {step === 'location' && (
          <LocationStep
            key="location"
            onAllow={() => {
              onAllowLocation();
              onDone();
            }}
            onSkip={onDone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SplashStep() {
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-6"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 180 }}
      >
        <Logo size={56} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-[13px] uppercase tracking-brand text-muted"
      >
        Find it. Save it. Go to it.
      </motion.p>
    </motion.div>
  );
}

function StepShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function WelcomeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <StepShell>
      <div className="flex items-center justify-between p-5">
        <Logo size={26} />
        <button onClick={onSkip} className="text-[14px] text-muted">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 200, delay: 0.1 }}
          className="relative mb-10"
        >
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-brand-50">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand shadow-float">
              <MapPin size={44} className="text-white" fill="white" strokeWidth={1.5} />
            </div>
          </div>
          <motion.span
            className="absolute -right-1 top-4 h-4 w-4 rounded-full bg-brand-300"
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
          />
          <motion.span
            className="absolute -left-2 bottom-6 h-3 w-3 rounded-full bg-brand-200"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2.8 }}
          />
        </motion.div>

        <h1 className="text-center font-serif text-[34px] leading-[1.1] text-ink">
          Find events that <span className="text-brand">move you</span>.
        </h1>
        <p className="mt-3 max-w-[17rem] text-center text-[15px] leading-relaxed text-muted">
          From gigs to art shows, night markets to meetups — discover what's
          happening around you on a live map.
        </p>
      </div>

      <div className="px-6 pb-8">
        <PrimaryButton full onClick={onNext}>
          Next
        </PrimaryButton>
      </div>
    </StepShell>
  );
}

function LocationStep({
  onAllow,
  onSkip,
}: {
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <StepShell>
      <div className="flex items-center justify-between p-5">
        <Logo size={26} />
        <button onClick={onSkip} className="text-[14px] text-muted">
          Not now
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 200 }}
          className="mb-10 flex h-40 w-40 items-center justify-center rounded-full bg-brand-50"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-float">
            <Navigation size={40} className="text-brand" fill="#10B981" strokeWidth={1.2} />
          </div>
        </motion.div>

        <h1 className="text-center font-serif text-[34px] leading-[1.1] text-ink">
          Allow location to find events near you.
        </h1>
        <p className="mt-3 max-w-[17rem] text-center text-[15px] leading-relaxed text-muted">
          We'll use your location to show what's happening around you. You can
          change this anytime.
        </p>
      </div>

      <div className="space-y-3 px-6 pb-8">
        <PrimaryButton full onClick={onAllow}>
          Allow Location
        </PrimaryButton>
        <button
          onClick={onSkip}
          className="w-full py-2 text-center text-[14px] text-muted"
        >
          Maybe later
        </button>
      </div>
    </StepShell>
  );
}
