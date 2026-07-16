import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import type { SpotEvent } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';

interface SubmissionStatusProps {
  event: SpotEvent;
  onDone: () => void;
  onCreateAnother: () => void;
}

export function SubmissionStatus({
  event,
  onDone,
  onCreateAnother,
}: SubmissionStatusProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-bg px-8 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200 }}
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-brandsoft"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-float">
          <Check size={34} strokeWidth={2.4} />
        </div>
      </motion.div>

      <h1 className="font-serif text-[32px] leading-tight text-ink">
        Submitted for review
      </h1>
      <p className="mt-2 max-w-[18rem] text-[14.5px] leading-relaxed text-muted">
        <span className="text-ink">{event.title}</span> is now in the moderation
        queue. We'll get it on the map once it's approved.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[13px] text-muted">
        <Clock size={15} strokeWidth={1.8} />
        Status: Pending review
      </div>

      <div className="mt-8 w-full max-w-xs space-y-3">
        <PrimaryButton full onClick={onDone}>
          Back to map
        </PrimaryButton>
        <button
          onClick={onCreateAnother}
          className="w-full py-2 text-[14px] text-muted"
        >
          Create another event
        </button>
      </div>
    </div>
  );
}
