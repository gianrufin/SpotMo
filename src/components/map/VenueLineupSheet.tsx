import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SpotEvent } from '../../types';
import { EventListItem } from '../cards/EventListItem';
import { sortByDate } from '../../lib/filters';

interface VenueLineupSheetProps {
  events: SpotEvent[];
  onOpen: (id: string) => void;
  onClose: () => void;
}

/** Opened by tapping a stacked-poster venue pin — every event at that venue,
 * soonest first, each tapping through to its own full detail. */
export function VenueLineupSheet({ events, onOpen, onClose }: VenueLineupSheetProps) {
  const sorted = sortByDate(events);
  const venue = events[0];

  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col justify-end bg-black/40"
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
          <div>
            <p className="font-serif text-lg text-ink">This week at {venue.venue}</p>
            <p className="text-[12.5px] text-muted">{events.length} events</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.9} />
          </button>
        </div>

        <div className="space-y-2.5">
          {sorted.map((e) => (
            <EventListItem key={e.id} event={e} onClick={() => onOpen(e.id)} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
