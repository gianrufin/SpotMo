import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** full-height sheet (event detail) vs auto-height (preview card) */
  full?: boolean;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  full = false,
  className = '',
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className={`absolute inset-x-0 bottom-0 z-50 overflow-hidden bg-card shadow-float ${
              full ? 'top-0 rounded-none' : 'rounded-t-[2rem]'
            } ${className}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            drag={full ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
