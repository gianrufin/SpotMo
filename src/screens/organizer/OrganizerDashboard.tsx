import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Check, AlertCircle, QrCode as QrCodeIcon } from 'lucide-react';
import type { Submission, SubmissionStatus, SpotEvent } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { SegmentedTabs } from '../../components/common/SegmentedTabs';
import { EmptyState } from '../../components/common/EmptyState';
import { formatShortDate } from '../../lib/format';
import { categoryLabel } from '../../data/categories';
import { EditSubmission } from '../admin/EditSubmission';
import { EventQrSheet } from './EventQrSheet';

type Result = { ok: boolean; error?: string };

interface OrganizerDashboardProps {
  organizerName: string;
  submissions: Submission[];
  onBack: () => void;
  onCreate: () => void;
  onSignOut?: () => void;
  /** When set, shows a pencil icon letting the organizer rename themselves
   * (their venue/production/organizer name — shown on their events). */
  onEditName?: (name: string) => void;
  /** Edit one of your own events, at any status. Editing can never change
   * the event's approval status itself — that's admin-only, server-enforced
   * regardless of what a request sends (see schema.sql's status trigger). */
  onUpdate?: (id: string, patch: Partial<SpotEvent>) => Promise<Result>;
  dark?: boolean;
}

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-brandsoft text-brandsoftfg',
  rejected: 'bg-red-100 text-red-600',
};

type Filter = 'all' | 'approved' | 'pending';

export function OrganizerDashboard({
  submissions,
  organizerName,
  onBack,
  onCreate,
  onSignOut,
  onEditName,
  onUpdate,
  dark = false,
}: OrganizerDashboardProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(organizerName);
  const [editing, setEditing] = useState<Submission | null>(null);
  const [qrEvent, setQrEvent] = useState<Submission | null>(null);
  const [error, setError] = useState('');

  const counts = useMemo(() => {
    return {
      total: submissions.length,
      approved: submissions.filter((s) => s.status === 'approved').length,
      pending: submissions.filter((s) => s.status === 'pending').length,
    };
  }, [submissions]);

  const list = useMemo(
    () =>
      submissions.filter((s) =>
        filter === 'all' ? true : s.status === filter,
      ),
    [submissions, filter],
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-hairline bg-card px-4 py-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft size={19} strokeWidth={1.9} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-muted">SpotMo for Organizers</p>
          {editingName ? (
            <div className="mt-1 flex items-center gap-1.5">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="input py-1.5 text-[14px]"
                autoFocus
              />
              <button
                onClick={() => {
                  onEditName?.(nameDraft.trim() || organizerName);
                  setEditingName(false);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-onink"
                aria-label="Save name"
              >
                <Check size={14} strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 truncate font-serif text-xl leading-none text-ink">
              {greeting}, {organizerName}
              {onEditName && (
                <button
                  onClick={() => {
                    setNameDraft(organizerName);
                    setEditingName(true);
                  }}
                  className="shrink-0 text-muted"
                  aria-label="Edit organizer name"
                >
                  <Pencil size={14} strokeWidth={1.9} />
                </button>
              )}
            </p>
          )}
        </div>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-[12.5px] text-muted transition active:scale-95"
          >
            Sign out
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total" value={counts.total} accent />
          <StatTile label="Approved" value={counts.approved} />
          <StatTile label="Pending" value={counts.pending} />
        </div>

        {/* My events */}
        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">My Events</h2>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[12.5px] text-red-600">
            <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="mt-3">
          <SegmentedTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'approved', label: 'Approved' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        </div>

        <div className="mt-3 space-y-2.5">
          {submissions.length === 0 ? (
            <EmptyState
              icon={<Plus size={26} strokeWidth={1.6} />}
              title="No events yet"
              message="Create your first event and it'll show up here once submitted."
              action={
                <PrimaryButton onClick={onCreate}>Create event</PrimaryButton>
              }
            />
          ) : list.length === 0 ? (
            <p className="py-8 text-center font-serif text-lg text-muted">
              No {filter} events.
            </p>
          ) : (
            list.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-3xl bg-card p-2.5 shadow-soft"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                  <img
                    src={s.posterUrl}
                    alt={s.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] uppercase tracking-wide text-brand">
                      {categoryLabel(s.category)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${STATUS_STYLE[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <h3 className="truncate font-serif text-[17px] leading-tight text-ink">
                    {s.title}
                  </h3>
                  <p className="truncate text-[11.5px] text-muted">
                    {formatShortDate(s.startsAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {onUpdate && (
                    <button
                      onClick={() => {
                        setError('');
                        setEditing(s);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink"
                      aria-label="Edit event"
                    >
                      <Pencil size={15} strokeWidth={1.9} />
                    </button>
                  )}
                  {s.status === 'approved' && (
                    <button
                      onClick={() => setQrEvent(s)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink"
                      aria-label="Show QR code"
                    >
                      <QrCodeIcon size={15} strokeWidth={1.9} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sticky create button */}
      <div className="absolute inset-x-0 bottom-0 border-t border-hairline bg-card/90 p-4 pb-5 backdrop-blur">
        <PrimaryButton
          full
          icon={<Plus size={18} strokeWidth={2.2} />}
          onClick={onCreate}
        >
          Create Event
        </PrimaryButton>
      </div>

      {editing && onUpdate && (
        <EditSubmission
          submission={editing}
          dark={dark}
          onCancel={() => setEditing(null)}
          onSave={async (patch) => {
            const id = editing.id;
            setEditing(null);
            const result = await onUpdate(id, patch);
            if (!result.ok) setError(result.error ?? 'Something went wrong.');
          }}
        />
      )}

      {qrEvent && <EventQrSheet event={qrEvent} onClose={() => setQrEvent(null)} />}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-4 shadow-soft ${
        accent ? 'bg-ink text-onink' : 'bg-card text-ink'
      }`}
    >
      <p className="font-serif text-3xl leading-none">{value}</p>
      <p
        className={`mt-1 text-[12px] ${accent ? 'text-onink/60' : 'text-muted'}`}
      >
        {label}
      </p>
    </div>
  );
}
