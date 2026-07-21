import { useState } from 'react';
import { X, Check, ImagePlus } from 'lucide-react';
import type { Submission, SpotEvent, Category } from '../types';
import { CATEGORIES } from '../data/categories';
import { PrimaryButton } from '../components/common/PrimaryButton';

type Result = { ok: boolean; error?: string };

export interface EventFormValues {
  event: SpotEvent;
  organizerName: string;
}

interface EventFormModalProps {
  mode: 'add' | 'edit';
  initial?: Submission;
  onCancel: () => void;
  onSubmit: (values: EventFormValues) => Promise<Result>;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function toDateInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Add/edit form for a single event. Deliberately plain — text lat/lng
 * inputs instead of a Leaflet picker, a poster URL field plus optional file
 * upload instead of the cropper — so this standalone admin bundle never
 * pulls in map or animation libraries. */
export function EventFormModal({ mode, initial, onCancel, onSubmit }: EventFormModalProps) {
  const [posterUrl, setPosterUrl] = useState(initial?.posterUrl ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'community');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [lat, setLat] = useState(initial ? String(initial.lat) : '');
  const [lng, setLng] = useState(initial ? String(initial.lng) : '');
  const [date, setDate] = useState(toDateInput(initial?.startsAt));
  const [time, setTime] = useState(toTimeInput(initial?.startsAt) || '19:00');
  const [endDate, setEndDate] = useState(toDateInput(initial?.endsAt));
  const [endTime, setEndTime] = useState(toTimeInput(initial?.endsAt));
  const [price, setPrice] = useState(initial?.isFree === false ? initial.priceLabel : '');
  const [ticketUrl, setTicketUrl] = useState(initial?.ticketUrl ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [lineup, setLineup] = useState((initial?.lineup ?? []).join(', '));
  const [organizerName, setOrganizerName] = useState(initial?.submittedBy ?? initial?.organizer ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid =
    title.trim().length > 0 &&
    venue.trim().length > 0 &&
    date.length > 0 &&
    lat.trim().length > 0 &&
    lng.trim().length > 0 &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lng));

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPosterUrl(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function submit() {
    setBusy(true);
    setError('');
    const startsAt = new Date(`${date}T${time || '19:00'}`).toISOString();
    const endsAt = endDate ? new Date(`${endDate}T${endTime || '23:00'}`).toISOString() : undefined;
    const isFree = !price.trim() || /free/i.test(price);
    const event: SpotEvent = {
      id: initial?.id ?? `admin-${Date.now()}`,
      title: title.trim(),
      category,
      posterUrl: posterUrl.trim(),
      lat: Number(lat),
      lng: Number(lng),
      venue: venue.trim(),
      address: address.trim(),
      city: city.trim(),
      startsAt,
      endsAt,
      priceLabel: isFree ? 'Free' : price.trim(),
      isFree,
      description: description.trim(),
      lineup: lineup.trim() ? lineup.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      ticketUrl: ticketUrl.trim() || undefined,
      organizer: organizerName.trim() || undefined,
    };
    const result = await onSubmit({ event, organizerName: organizerName.trim() || 'Admin' });
    setBusy(false);
    if (!result.ok) setError(result.error ?? 'Something went wrong.');
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 animate-fade-in sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-card shadow-xl">
        <header className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="text-[17px] font-medium text-ink">
            {mode === 'add' ? 'Add event' : 'Edit event'}
          </h2>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
            aria-label="Close"
          >
            <X size={17} strokeWidth={1.9} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Poster" className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {posterUrl && (
                    <img src={posterUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://…"
                    className="input"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] text-brand">
                    <ImagePlus size={13} strokeWidth={1.9} />
                    Upload instead
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                </div>
              </div>
            </Field>

            <Field label="Event title" className="sm:col-span-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
            </Field>

            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Organizer">
              <input
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. saGuijo Presents"
                className="input"
              />
            </Field>

            <Field label="Venue">
              <input value={venue} onChange={(e) => setVenue(e.target.value)} className="input" />
            </Field>
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} className="input" />
            </Field>

            <Field label="Address" className="sm:col-span-2">
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
            </Field>

            <Field label="Latitude">
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="14.5547"
                inputMode="decimal"
                className="input"
              />
            </Field>
            <Field label="Longitude">
              <input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="121.0244"
                inputMode="decimal"
                className="input"
              />
            </Field>

            <Field label="Starts">
              <div className="flex gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
              </div>
            </Field>
            <Field label="Ends (optional)">
              <div className="flex gap-2">
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" />
              </div>
            </Field>

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

            <Field label="Lineup (comma-separated)" className="sm:col-span-2">
              <input value={lineup} onChange={(e) => setLineup(e.target.value)} className="input" />
            </Field>

            <Field label="Description" className="sm:col-span-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="input resize-none"
              />
            </Field>
          </div>

          {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}
          {mode === 'add' && (
            <p className="mt-3 text-[12px] text-muted">
              New events are created as pending — approve them from the list once added.
            </p>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-hairline px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full bg-surface py-2.5 text-[14px] text-ink transition active:scale-[0.98]"
          >
            Cancel
          </button>
          <div className="flex-1">
            <PrimaryButton
              full
              icon={<Check size={16} strokeWidth={2.2} />}
              disabled={!valid || busy}
              onClick={submit}
            >
              {busy ? 'Saving…' : mode === 'add' ? 'Create event' : 'Save changes'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
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
