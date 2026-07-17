import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { PrimaryButton } from './PrimaryButton';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions (delete, remove). */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Centered confirmation modal — used before any destructive or
 * hard-to-undo action (delete, sign out). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <motion.div
      className="absolute inset-0 z-[90] flex items-center justify-center bg-black/50 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-xs rounded-3xl bg-card p-5 shadow-float"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${
            danger ? 'bg-red-100 text-red-600' : 'bg-brandsoft text-brand'
          }`}
        >
          <AlertTriangle size={20} strokeWidth={1.9} />
        </div>
        <p className="font-serif text-lg text-ink">{title}</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{message}</p>

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full bg-surface py-2.5 text-[14px] text-ink transition active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <div className="flex-1">
            <PrimaryButton
              full
              onClick={onConfirm}
              className={danger ? '!bg-red-600 hover:!opacity-90' : ''}
            >
              {confirmLabel}
            </PrimaryButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
