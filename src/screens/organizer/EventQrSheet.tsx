import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { SpotEvent } from '../../types';
import { QrCode } from '../../components/common/QrCode';
import { eventShareUrl } from '../../lib/format';

interface EventQrSheetProps {
  event: SpotEvent;
  onClose: () => void;
}

/** Lets an organizer grab a QR code linking straight to their event — meant
 * to be printed on the physical poster, closing the loop back to the app. */
export function EventQrSheet({ event, onClose }: EventQrSheetProps) {
  const [copied, setCopied] = useState(false);
  const url = eventShareUrl(event);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <motion.div
      className="absolute inset-0 z-[80] flex flex-col justify-end bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="rounded-t-3xl bg-card p-5 pb-8"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-serif text-lg text-ink">Scan to open</p>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.9} />
          </button>
        </div>

        <div className="flex justify-center">
          <div className="overflow-hidden rounded-2xl border border-hairline">
            <QrCode value={url} size={220} />
          </div>
        </div>

        <p className="mt-4 truncate text-center font-title text-[15px] leading-tight text-ink">
          {event.title}
        </p>
        <p className="mt-1 text-center text-[12.5px] text-muted">
          Print this on your poster — scanning it opens this event directly.
        </p>

        <button
          onClick={copyLink}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-surface py-2.5 text-[13px] text-ink"
        >
          {copied ? (
            <>
              <Check size={14} strokeWidth={2.2} /> Copied
            </>
          ) : (
            <>
              <Copy size={14} strokeWidth={1.9} /> Copy link
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
