import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  ShieldCheck,
  Inbox,
  Pencil,
  AlertCircle,
  Eye,
  Heart,
  ListChecks,
  ChevronDown,
} from 'lucide-react';
import type { Submission, SubmissionStatus, SpotEvent } from '../../types';
import { SegmentedTabs } from '../../components/common/SegmentedTabs';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SearchBar } from '../../components/common/SearchBar';
import { formatShortDate } from '../../lib/format';
import { categoryLabel } from '../../data/categories';
import { EditSubmission } from './EditSubmission';

type Result = { ok: boolean; error?: string };

interface AdminQueueProps {
  submissions: Submission[];
  onBack: () => void;
  onSetStatus: (id: string, status: SubmissionStatus) => Promise<Result>;
  onRemove: (id: string) => Promise<Result>;
  onUpdate: (id: string, patch: Partial<SpotEvent>) => Promise<Result>;
  onBulkSetStatus: (ids: string[], status: SubmissionStatus) => Promise<Result>;
  onBulkRemove: (ids: string[]) => Promise<Result>;
  dark: boolean;
}

type Filter = 'pending' | 'approved' | 'rejected';

const PAGE_SIZE = 10;

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-brandsoft text-brandsoftfg',
  rejected: 'bg-red-100 text-red-600',
};

function matchesSearch(s: Submission, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    s.title.toLowerCase().includes(q) ||
    s.venue.toLowerCase().includes(q) ||
    s.city.toLowerCase().includes(q) ||
    (s.submittedBy ?? '').toLowerCase().includes(q)
  );
}

export function AdminQueue({
  submissions,
  onBack,
  onSetStatus,
  onRemove,
  onUpdate,
  onBulkSetStatus,
  onBulkRemove,
  dark,
}: AdminQueueProps) {
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Submission | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkRemove, setConfirmBulkRemove] = useState(false);

  const filtered = useMemo(
    () => submissions.filter((s) => s.status === filter && matchesSearch(s, search)),
    [submissions, filter, search],
  );
  const list = filtered.slice(0, visibleCount);
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  // Any change to the active tab or search resets pagination and selection —
  // stale checkboxes referring to rows no longer on screen would be confusing.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSelected(new Set());
  }, [filter, search]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const allSelected = list.every((s) => prev.has(s.id));
      if (allSelected) return new Set();
      return new Set(list.map((s) => s.id));
    });
  }

  async function runAction(id: string, action: () => Promise<Result>) {
    setBusyId(id);
    setError('');
    const result = await action();
    setBusyId(null);
    if (!result.ok) setError(result.error ?? 'Something went wrong.');
  }

  async function runBulk(action: () => Promise<Result>) {
    setBulkBusy(true);
    setError('');
    const result = await action();
    setBulkBusy(false);
    if (!result.ok) setError(result.error ?? 'Something went wrong.');
    else setSelected(new Set());
  }

  const selectedIds = Array.from(selected);

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft size={19} strokeWidth={1.9} />
        </button>
        <div className="flex-1">
          <p className="font-serif text-xl leading-none text-ink">
            Moderation queue
          </p>
          <p className="text-[12px] text-muted">
            {pendingCount} awaiting review
          </p>
        </div>
        <button
          onClick={() => {
            setSelectMode((v) => !v);
            setSelected(new Set());
          }}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition active:scale-95 ${
            selectMode ? 'bg-ink text-onink' : 'bg-surface text-ink'
          }`}
        >
          <ListChecks size={15} strokeWidth={1.9} />
          {selectMode ? 'Done' : 'Select'}
        </button>
      </header>

      <div className="space-y-2.5 px-5 py-3">
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search title, venue, city, organizer"
        />
      </div>

      {selectMode && (
        <div className="flex items-center gap-2.5 border-b border-hairline bg-surface px-4 py-2.5">
          <button
            onClick={selectAllVisible}
            className="text-[12.5px] text-ink underline underline-offset-2"
          >
            {list.length > 0 && list.every((s) => selected.has(s.id)) ? 'Deselect all' : 'Select all shown'}
          </button>
          <span className="text-[12.5px] text-muted">{selected.size} selected</span>
        </div>
      )}

      {error && (
        <div className="mx-4 mb-2 mt-2 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[12.5px] text-red-600">
          <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {submissions.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={26} strokeWidth={1.6} />}
            title="Queue is clear"
            message="Events submitted by organizers show up here for review before going live."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox size={26} strokeWidth={1.6} />}
            title={search ? 'No matches' : `No ${filter} events`}
            message={
              search
                ? 'Try a different search term.'
                : 'Switch tabs to see events in other states.'
            }
          />
        ) : (
          <>
            <div className="space-y-3 pt-1">
              {list.map((s) => (
                <div key={s.id} className="flex items-stretch gap-2">
                  {selectMode && (
                    <button
                      onClick={() => toggleSelected(s.id)}
                      className="flex w-8 shrink-0 items-start justify-center pt-4"
                      aria-label={selected.has(s.id) ? 'Deselect' : 'Select'}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                          selected.has(s.id)
                            ? 'border-brand bg-brand text-onbrand'
                            : 'border-hairline bg-card'
                        }`}
                      >
                        {selected.has(s.id) && <Check size={13} strokeWidth={3} />}
                      </span>
                    </button>
                  )}
                  <div className="min-w-0 flex-1 overflow-hidden rounded-3xl bg-card shadow-soft">
                    <div className="flex gap-3 p-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                        <img
                          src={s.posterUrl}
                          alt={s.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-wide text-brand">
                            {categoryLabel(s.category)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${STATUS_STYLE[s.status]}`}
                          >
                            {s.status}
                          </span>
                        </div>
                        <h3 className="truncate font-title text-lg leading-tight text-ink">
                          {s.title}
                        </h3>
                        <p className="truncate text-[12px] text-muted">
                          {formatShortDate(s.startsAt)}
                        </p>
                        <p className="truncate text-[12px] text-muted">
                          {s.venue} · by {s.submittedBy}
                        </p>
                        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted">
                          <span className="flex items-center gap-1">
                            <Eye size={11} strokeWidth={1.9} /> {s.viewCount ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart size={11} strokeWidth={1.9} /> {s.saveCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex border-t border-hairline">
                      {s.status !== 'approved' && (
                        <button
                          onClick={() => runAction(s.id, () => onSetStatus(s.id, 'approved'))}
                          disabled={busyId === s.id}
                          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[13px] text-brand transition active:bg-brandsoft disabled:opacity-50"
                        >
                          <Check size={16} strokeWidth={2.2} /> Approve
                        </button>
                      )}
                      {s.status !== 'rejected' && (
                        <button
                          onClick={() => runAction(s.id, () => onSetStatus(s.id, 'rejected'))}
                          disabled={busyId === s.id}
                          className="flex flex-1 items-center justify-center gap-1.5 border-l border-hairline py-3 text-[13px] text-muted transition active:bg-surface disabled:opacity-50"
                        >
                          <X size={16} strokeWidth={2.2} /> Reject
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(s)}
                        className="flex flex-1 items-center justify-center gap-1.5 border-l border-hairline py-3 text-[13px] text-ink transition active:bg-surface"
                      >
                        <Pencil size={15} strokeWidth={1.9} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        disabled={busyId === s.id}
                        className="flex flex-1 items-center justify-center gap-1.5 border-l border-hairline py-3 text-[13px] text-red-500 transition active:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={16} strokeWidth={1.9} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length > visibleCount && (
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-surface px-4 py-2.5 text-[13px] text-ink transition active:scale-95"
              >
                Show 10 more <ChevronDown size={15} strokeWidth={1.9} />
              </button>
            )}
            <p className="mt-3 text-center text-[11.5px] text-muted">
              Showing {list.length} of {filtered.length}
            </p>
          </>
        )}
      </div>

      {selectMode && selected.size > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-40 border-t border-hairline bg-card/95 px-4 py-3 backdrop-blur">
          <div className="mb-2 text-[12.5px] text-muted">{selected.size} selected</div>
          <div className="flex gap-2">
            {filter !== 'approved' && (
              <button
                onClick={() => runBulk(() => onBulkSetStatus(selectedIds, 'approved'))}
                disabled={bulkBusy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-[13px] text-onbrand transition active:scale-[0.98] disabled:opacity-50"
              >
                <Check size={15} strokeWidth={2.2} /> Approve
              </button>
            )}
            {filter !== 'rejected' && (
              <button
                onClick={() => runBulk(() => onBulkSetStatus(selectedIds, 'rejected'))}
                disabled={bulkBusy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface py-2.5 text-[13px] text-ink transition active:scale-[0.98] disabled:opacity-50"
              >
                <X size={15} strokeWidth={2.2} /> Reject
              </button>
            )}
            <button
              onClick={() => setConfirmBulkRemove(true)}
              disabled={bulkBusy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-50 py-2.5 text-[13px] text-red-600 transition active:scale-[0.98] disabled:opacity-50"
            >
              <Trash2 size={15} strokeWidth={1.9} /> Remove
            </button>
          </div>
        </div>
      )}

      {editing && (
        <EditSubmission
          submission={editing}
          dark={dark}
          onCancel={() => setEditing(null)}
          onSave={async (patch) => {
            const id = editing.id;
            setEditing(null);
            await runAction(id, () => onUpdate(id, patch));
          }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Remove this event?"
          message="This permanently deletes the submission. This can't be undone."
          confirmLabel="Remove"
          danger
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            const id = confirmDeleteId;
            setConfirmDeleteId(null);
            void runAction(id, () => onRemove(id));
          }}
        />
      )}

      {confirmBulkRemove && (
        <ConfirmDialog
          title={`Remove ${selected.size} event${selected.size === 1 ? '' : 's'}?`}
          message="This permanently deletes the selected submissions. This can't be undone."
          confirmLabel="Remove all"
          danger
          onCancel={() => setConfirmBulkRemove(false)}
          onConfirm={() => {
            setConfirmBulkRemove(false);
            void runBulk(() => onBulkRemove(selectedIds));
          }}
        />
      )}
    </div>
  );
}
