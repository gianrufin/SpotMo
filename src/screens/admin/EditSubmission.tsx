import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Submission, SpotEvent, Category } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { VenueAutocomplete } from '../../components/common/VenueAutocomplete';
import { CATEGORIES } from '../../data/categories';

interface EditSubmissionProps {
  submission: Submission;
  onCancel: () => void;
  onSave: (patch: Partial<SpotEvent>) => void;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function toDateInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditSubmission({ submission, onCancel, onSave }: EditSubmissionProps) {
  const [title, setTitle] = useState(submission.title);
  const [category, setCategory] = useState<Category>(submission.category);
  const [venue, setVenue] = useState(submission.venue);
  const [address, setAddress] = useState(submission.address);
  const [city, setCity] = useState(submission.city);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState(toDateInput(submission.startsAt));
  const [time, setTime] = useState(toTimeInput(submission.startsAt));
  const [price, setPrice] = useState(submission.isFree ? '' : submission.priceLabel);
  const [ticketUrl, setTicketUrl] = useState(submission.ticketUrl ?? '');
  const [description, setDescription] = useState(submission.description);

  function handleSave() {
    const startsAt = new Date(`${date}T${time || '19:00'}`).toISOString();
    const isFree = !price.trim() || /free/i.test(price);
    onSave({
      title: title.trim() || submission.title,
      category,
      venue: venue.trim(),
      address: address.trim(),
      city,
      startsAt,
      priceLabel: isFree ? 'Free' : price.trim(),
      isFree,
      ticketUrl: ticketUrl.trim() || undefined,
      description: description.trim(),
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    });
  }

  return (
    <motion.div
      className="absolute inset-0 z-[70] flex flex-col bg-bg"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 34, stiffness: 320 }}
    >
      <header className="flex items-center justify-between border-b border-hairline px-4 py-4">
        <button
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
          aria-label="Cancel"
        >
          <X size={19} strokeWidth={1.9} />
        </button>
        <p className="font-serif text-lg text-ink">Edit event</p>
        <div className="w-9" />
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-28 pt-4">
        <Field label="Event title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </Field>

        <Field label="Category">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition ${
                  category === c.id ? 'bg-ink text-onink' : 'bg-surface text-ink'
                }`}
              >
                <c.icon size={14} strokeWidth={1.9} />
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Venue">
          <VenueAutocomplete
            value={venue}
            onChangeText={(text) => {
              setVenue(text);
              setCoords(null);
            }}
            onSelectPlace={(place) => {
              setVenue(place.name);
              setAddress(place.address);
              if (place.city) setCity(place.city);
              setCoords({ lat: place.lat, lng: place.lng });
            }}
          />
        </Field>

        <Field label="Address">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input"
          />
        </Field>

        <div className="flex gap-3">
          <Field label="Date" className="flex-1">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Time" className="w-32">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Price">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Free / ₱300"
            className="input"
          />
        </Field>

        <Field label="Ticket link">
          <input
            value={ticketUrl}
            onChange={(e) => setTicketUrl(e.target.value)}
            placeholder="https://…"
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input resize-none"
          />
        </Field>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-hairline bg-card/90 p-4 pb-5 backdrop-blur">
        <PrimaryButton full icon={<Check size={18} strokeWidth={2.2} />} onClick={handleSave}>
          Save changes
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[12.5px] text-muted">{label}</span>
      {children}
    </label>
  );
}
