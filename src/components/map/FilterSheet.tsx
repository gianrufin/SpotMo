import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Category } from '../../types';
import { CATEGORIES } from '../../data/categories';
import { useOverlayRoot } from '../../layout/PhoneFrame';

interface FilterSheetProps {
  category: Category | null;
  onChangeCategory: (category: Category | null) => void;
  onClose: () => void;
}

/** Category filter, opened from the map's "Filters" button. Portals above
 * the bottom nav (see useOverlayRoot) since this is rendered from inside the
 * map's isolated tab-content container. */
export function FilterSheet({ category, onChangeCategory, onClose }: FilterSheetProps) {
  const overlayRoot = useOverlayRoot();
  if (!overlayRoot) return null;

  return createPortal(
    <motion.div
      className="pointer-events-auto absolute inset-0 flex flex-col justify-end bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-h-[70%] overflow-y-auto rounded-t-3xl bg-card p-5 pb-8"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-serif text-lg text-ink">Categories</p>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.9} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onChangeCategory(active ? null : c.id)}
                className={`flex items-center gap-2 rounded-2xl px-3.5 py-3 text-[14px] transition ${
                  active ? 'bg-ink text-onink' : 'bg-surface text-ink'
                }`}
              >
                <c.icon size={16} strokeWidth={1.9} />
                {c.label}
                {active && <Check size={14} strokeWidth={2.2} className="ml-auto" />}
              </button>
            );
          })}
        </div>

        {category && (
          <button
            onClick={() => onChangeCategory(null)}
            className="mt-4 w-full py-2 text-center text-[13.5px] text-muted"
          >
            Clear category
          </button>
        )}
      </motion.div>
    </motion.div>,
    overlayRoot,
  );
}
