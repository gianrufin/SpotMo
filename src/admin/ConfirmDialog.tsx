import { AlertTriangle } from 'lucide-react';
import { PrimaryButton } from '../components/common/PrimaryButton';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Plain CSS-only confirm modal — deliberately doesn't pull in framer-motion,
 * to keep this standalone admin bundle light. */
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${
            danger ? 'bg-red-100 text-red-600' : 'bg-brandsoft text-brandsoftfg'
          }`}
        >
          <AlertTriangle size={20} strokeWidth={1.9} />
        </div>
        <p className="text-[17px] font-medium text-ink">{title}</p>
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
      </div>
    </div>
  );
}
