import { useState } from 'react';
import {
  ArrowLeft,
  ImagePlus,
  Check,
  CalendarClock,
  MapPin,
  Ticket,
} from 'lucide-react';
import type { Category, SpotEvent } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { Logo } from '../../components/common/Logo';
import { CATEGORIES } from '../../data/categories';
import { MANILA } from '../../lib/useUserLocation';

interface CreateEventFlowProps {
  onCancel: () => void;
  onSubmit: (event: SpotEvent) => void;
}

interface Draft {
  poster: string | null;
  title: string;
  venue: string;
  address: string;
  city: string;
  date: string;
  time: string;
  category: Category;
  description: string;
  price: string;
  ticketUrl: string;
}

const EMPTY_DRAFT: Draft = {
  poster: null,
  title: '',
  venue: '',
  address: '',
  city: 'Metro Manila',
  date: '',
  time: '19:00',
  category: 'music',
  description: '',
  price: '',
  ticketUrl: '',
};

const STOCK_POSTERS = [
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1524650359799-842906ca1c06?auto=format&fit=crop&w=600&q=70',
];

export function CreateEventFlow({ onCancel, onSubmit }: CreateEventFlowProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) set('poster', URL.createObjectURL(file));
  }

  const canNext1 = !!draft.poster;
  const canNext2 =
    draft.title.trim() && draft.venue.trim() && draft.date && draft.category;

  function finalize() {
    const startsAt = draft.date
      ? new Date(`${draft.date}T${draft.time || '19:00'}`).toISOString()
      : new Date().toISOString();
    const isFree = !draft.price.trim() || /free/i.test(draft.price);
    const event: SpotEvent = {
      id: `sub-${Date.now()}`,
      title: draft.title.trim(),
      category: draft.category,
      posterUrl: draft.poster ?? STOCK_POSTERS[0],
      // jitter around Manila so submitted pins don't stack exactly
      lat: MANILA.lat + (Math.random() - 0.5) * 0.06,
      lng: MANILA.lng + (Math.random() - 0.5) * 0.06,
      venue: draft.venue.trim(),
      address: draft.address.trim() || draft.city,
      city: draft.city.trim(),
      startsAt,
      priceLabel: isFree ? 'Free' : draft.price.trim(),
      isFree,
      description:
        draft.description.trim() ||
        'A new local event submitted through SpotMo.',
      ticketUrl: draft.ticketUrl.trim() || undefined,
      organizer: 'You',
    };
    onSubmit(event);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* header */}
      <header className="flex items-center justify-between border-b border-hairline px-4 py-4">
        <button
          onClick={step === 1 ? onCancel : () => setStep(step - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft size={19} strokeWidth={1.9} />
        </button>
        <div className="text-center">
          <p className="font-serif text-lg leading-none text-ink">Create Event</p>
          <p className="text-[11px] text-muted">Step {step} of 3</p>
        </div>
        <div className="w-9" />
      </header>

      {/* progress */}
      <div className="flex gap-1.5 px-5 py-3">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              n <= step ? 'bg-brand' : 'bg-hairline'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {step === 1 && (
          <div className="pt-2">
            <h2 className="font-serif text-2xl text-ink">Upload your poster</h2>
            <p className="mt-1 text-[13px] text-muted">
              A striking poster is the heart of your listing.
            </p>

            <label className="mt-5 flex aspect-[3/4] max-h-[46vh] w-full cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-hairline bg-surface">
              {draft.poster ? (
                <img
                  src={draft.poster}
                  alt="Poster preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted">
                  <ImagePlus size={34} strokeWidth={1.5} />
                  <span className="text-[13px]">Tap to upload (JPG / PNG)</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>

            <p className="mt-4 mb-2 text-[12px] text-muted">Or pick a sample poster</p>
            <div className="grid grid-cols-4 gap-2">
              {STOCK_POSTERS.map((p) => (
                <button
                  key={p}
                  onClick={() => set('poster', p)}
                  className={`aspect-[3/4] overflow-hidden rounded-xl border-2 transition ${
                    draft.poster === p ? 'border-brand' : 'border-transparent'
                  }`}
                >
                  <img src={p} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 pt-2">
            <h2 className="font-serif text-2xl text-ink">Event details</h2>

            <Field label="Event title">
              <input
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Indie Night"
                className="input"
              />
            </Field>

            <Field label="Category">
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => set('category', c.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition ${
                      draft.category === c.id
                        ? 'bg-ink text-white'
                        : 'bg-surface text-ink'
                    }`}
                  >
                    <c.icon size={14} strokeWidth={1.9} />
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Venue" icon={<MapPin size={15} />}>
              <input
                value={draft.venue}
                onChange={(e) => set('venue', e.target.value)}
                placeholder="e.g. saGuijo Café + Bar"
                className="input"
              />
            </Field>

            <Field label="Address">
              <input
                value={draft.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Street, city"
                className="input"
              />
            </Field>

            <div className="flex gap-3">
              <Field label="Date" icon={<CalendarClock size={15} />} className="flex-1">
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => set('date', e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Time" className="w-32">
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => set('time', e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Tell people what to expect…"
                rows={3}
                className="input resize-none"
              />
            </Field>

            <div className="flex gap-3">
              <Field label="Price" className="w-32">
                <input
                  value={draft.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="Free / ₱300"
                  className="input"
                />
              </Field>
              <Field label="Ticket link" icon={<Ticket size={15} />} className="flex-1">
                <input
                  value={draft.ticketUrl}
                  onChange={(e) => set('ticketUrl', e.target.value)}
                  placeholder="https://…"
                  className="input"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pt-2">
            <h2 className="font-serif text-2xl text-ink">Review & submit</h2>
            <p className="mt-1 text-[13px] text-muted">
              Your event goes to moderation before it appears on the map.
            </p>

            <div className="mt-5 overflow-hidden rounded-3xl bg-surface shadow-soft">
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img
                  src={draft.poster ?? STOCK_POSTERS[0]}
                  alt="poster"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-2 p-4">
                <p className="text-[11px] uppercase tracking-wide text-brand">
                  {CATEGORIES.find((c) => c.id === draft.category)?.label}
                </p>
                <h3 className="font-serif text-2xl leading-tight text-ink">
                  {draft.title || 'Untitled event'}
                </h3>
                <ReviewLine label="When" value={`${draft.date || '—'} · ${draft.time}`} />
                <ReviewLine label="Where" value={draft.venue || '—'} />
                <ReviewLine label="Address" value={draft.address || draft.city} />
                <ReviewLine label="Price" value={draft.price.trim() || 'Free'} />
                {draft.ticketUrl && (
                  <ReviewLine label="Tickets" value={draft.ticketUrl} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* footer action */}
      <div className="absolute inset-x-0 bottom-0 border-t border-hairline bg-white/90 p-4 pb-5 backdrop-blur">
        {step < 3 ? (
          <PrimaryButton
            full
            onClick={() => setStep(step + 1)}
            disabled={step === 1 ? !canNext1 : !canNext2}
          >
            {step === 1 ? 'Continue' : 'Review'}
          </PrimaryButton>
        ) : (
          <PrimaryButton
            full
            variant="brand"
            icon={<Check size={18} strokeWidth={2.2} />}
            onClick={finalize}
          >
            Submit for Review
          </PrimaryButton>
        )}
      </div>

      {step === 1 && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 opacity-0">
          <Logo size={20} />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  icon,
  children,
  className = '',
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[13px]">
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-ink">{value}</span>
    </div>
  );
}
