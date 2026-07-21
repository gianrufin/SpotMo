import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Search,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Inbox,
  Eye,
  Heart,
} from 'lucide-react';
import type { Submission, SubmissionStatus } from '../types';
import { useRemoteEvents } from '../lib/useRemoteEvents';
import { categoryLabel } from '../data/categories';
import { formatShortDate } from '../lib/format';
import { EventFormModal, type EventFormValues } from './EventFormModal';
import { ConfirmDialog } from './ConfirmDialog';

type Result = { ok: boolean; error?: string };

interface DashboardProps {
  session: Session;
  email: string | null;
  dark: boolean;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected';
const PAGE_SIZE = 10;
const TABS: Filter[] = ['all', 'pending', 'approved', 'rejected'];

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
    (s.organizer ?? '').toLowerCase().includes(q) ||
    (s.submittedBy ?? '').toLowerCase().includes(q)
  );
}

export function Dashboard({ session, email, dark, onToggleTheme, onSignOut }: DashboardProps) {
  const remote = useRemoteEvents(session, true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<
    { mode: 'add' } | { mode: 'edit'; submission: Submission } | null
  >(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmBulkRemove, setConfirmBulkRemove] = useState(false);

  const counts = useMemo(
    () => ({
      all: remote.all.length,
      pending: remote.all.filter((s) => s.status === 'pending').length,
      approved: remote.all.filter((s) => s.status === 'approved').length,
      rejected: remote.all.filter((s) => s.status === 'rejected').length,
    }),
    [remote.all],
  );

  const filtered = useMemo(
    () =>
      remote.all.filter(
        (s) => (filter === 'all' || s.status === filter) && matchesSearch(s, search),
      ),
    [remote.all, filter, search],
  );
  const list = filtered.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSelected(new Set());
  }, [filter, search]);

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
      const allSelected = list.length > 0 && list.every((s) => prev.has(s.id));
      return allSelected ? new Set() : new Set(list.map((s) => s.id));
    });
  }

  const selectedIds = Array.from(selected);

  async function handleFormSubmit(values: EventFormValues): Promise<Result> {
    if (modal?.mode === 'edit') {
      const result = await remote.update(modal.submission.id, values.event);
      if (result.ok) setModal(null);
      return result;
    }
    const result = await remote.add(values.event, values.organizerName);
    if (result.ok) setModal(null);
    return result;
  }

  return (
    <div className="min-h-screen bg-surface pb-16">
      <header className="sticky top-0 z-30 border-b border-hairline bg-card/95 px-4 py-3.5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-[17px] font-medium text-ink">SpotMo Admin</h1>
            <p className="text-[12px] text-muted">{counts.pending} awaiting review</p>
          </div>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[13px] text-onbrand transition active:scale-95"
          >
            <Plus size={15} strokeWidth={2.2} /> Add event
          </button>
          <button
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={16} strokeWidth={1.9} /> : <Moon size={16} strokeWidth={1.9} />}
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="max-w-[12rem] truncate text-[12.5px] text-muted">{email}</span>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[13px] text-ink transition active:scale-95"
            >
              <LogOut size={14} strokeWidth={1.9} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5 rounded-full bg-card p-1 shadow-sm">
            {TABS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] capitalize transition ${
                  filter === f ? 'bg-ink text-onink' : 'text-ink hover:bg-surface'
                }`}
              >
                {f} <span className="opacity-60">{counts[f]}</span>
              </button>
            ))}
          </div>
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-sm sm:max-w-sm">
            <Search size={16} className="shrink-0 text-muted" strokeWidth={1.9} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, venue, city, organizer"
              className="w-full bg-transparent text-[13.5px] text-ink placeholder:text-muted focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search" className="text-muted">
                <X size={15} strokeWidth={1.9} />
              </button>
            )}
          </label>
        </div>

        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-sm">
            <span className="text-[13px] text-muted">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {filter !== 'approved' && (
                <button
                  onClick={() => runBulk(() => remote.bulkSetStatus(selectedIds, 'approved'))}
                  disabled={bulkBusy}
                  className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[12.5px] text-onbrand transition active:scale-95 disabled:opacity-50"
                >
                  <Check size={14} strokeWidth={2.2} /> Approve
                </button>
              )}
              {filter !== 'rejected' && (
                <button
                  onClick={() => runBulk(() => remote.bulkSetStatus(selectedIds, 'rejected'))}
                  disabled={bulkBusy}
                  className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[12.5px] text-ink transition active:scale-95 disabled:opacity-50"
                >
                  <X size={14} strokeWidth={2.2} /> Reject
                </button>
              )}
              <button
                onClick={() => setConfirmBulkRemove(true)}
                disabled={bulkBusy}
                className="flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-2 text-[12.5px] text-red-600 transition active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={14} strokeWidth={1.9} /> Remove
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-full px-3.5 py-2 text-[12.5px] text-muted"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
        )}

        <div className="mt-4">
          {remote.all.length === 0 ? (
            <EmptyRow icon={<Inbox size={22} strokeWidth={1.7} />} title="Queue is clear" />
          ) : filtered.length === 0 ? (
            <EmptyRow
              icon={<Inbox size={22} strokeWidth={1.7} />}
              title={search ? 'No matches' : `No ${filter} events`}
            />
          ) : (
            <>
              {/* Header row — desktop/tablet only */}
              <div className="hidden items-center gap-3 px-4 pb-2 text-[11.5px] uppercase tracking-wide text-muted lg:flex">
                <label className="flex w-5 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={list.length > 0 && list.every((s) => selected.has(s.id))}
                    onChange={selectAllVisible}
                    className="h-4 w-4 accent-current"
                  />
                </label>
                <span className="w-14" />
                <span className="min-w-0 flex-1">Event</span>
                <span className="w-32">Status</span>
                <span className="w-32">Date</span>
                <span className="w-36">Organizer</span>
                <span className="w-40 text-right">Actions</span>
              </div>

              <div className="space-y-2">
                {list.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:gap-3"
                  >
                    <div className="flex items-start gap-3 lg:contents">
                      <label className="flex w-5 shrink-0 items-center justify-center pt-1 lg:pt-0">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelected(s.id)}
                          className="h-4 w-4 accent-current"
                        />
                      </label>
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface lg:h-12 lg:w-14">
                        {s.posterUrl && (
                          <img src={s.posterUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] uppercase tracking-wide text-brand">
                            {categoryLabel(s.category)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] capitalize lg:hidden ${STATUS_STYLE[s.status]}`}>
                            {s.status}
                          </span>
                        </div>
                        <h3 className="truncate text-[14.5px] font-medium leading-tight text-ink">
                          {s.title}
                        </h3>
                        <p className="truncate text-[12px] text-muted">
                          {s.venue}
                          {s.city ? ` · ${s.city}` : ''}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2.5 text-[11px] text-muted lg:hidden">
                          <span className="flex items-center gap-1">
                            <Eye size={11} strokeWidth={1.9} /> {s.viewCount ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart size={11} strokeWidth={1.9} /> {s.saveCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:block lg:w-32">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${STATUS_STYLE[s.status]}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="hidden text-[13px] text-muted lg:block lg:w-32">
                      {formatShortDate(s.startsAt)}
                    </div>
                    <div className="hidden truncate text-[13px] text-muted lg:block lg:w-36">
                      {s.submittedBy || s.organizer || '—'}
                    </div>

                    <div className="flex items-center gap-1.5 lg:w-40 lg:justify-end">
                      {s.status !== 'approved' && (
                        <IconAction
                          label="Approve"
                          onClick={() => runAction(s.id, () => remote.setStatus(s.id, 'approved'))}
                          disabled={busyId === s.id}
                          tone="brand"
                        >
                          <Check size={15} strokeWidth={2.2} />
                        </IconAction>
                      )}
                      {s.status !== 'rejected' && (
                        <IconAction
                          label="Reject"
                          onClick={() => runAction(s.id, () => remote.setStatus(s.id, 'rejected'))}
                          disabled={busyId === s.id}
                        >
                          <X size={15} strokeWidth={2.2} />
                        </IconAction>
                      )}
                      <IconAction label="Edit" onClick={() => setModal({ mode: 'edit', submission: s })}>
                        <Pencil size={14} strokeWidth={1.9} />
                      </IconAction>
                      <IconAction
                        label="Remove"
                        onClick={() => setConfirmRemoveId(s.id)}
                        disabled={busyId === s.id}
                        tone="danger"
                      >
                        <Trash2 size={15} strokeWidth={1.9} />
                      </IconAction>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-card px-4 py-2.5 text-[13px] text-ink shadow-sm transition active:scale-95"
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
      </div>

      {modal && (
        <EventFormModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.submission : undefined}
          onCancel={() => setModal(null)}
          onSubmit={handleFormSubmit}
        />
      )}

      {confirmRemoveId && (
        <ConfirmDialog
          title="Remove this event?"
          message="This permanently deletes the submission. This can't be undone."
          confirmLabel="Remove"
          danger
          onCancel={() => setConfirmRemoveId(null)}
          onConfirm={() => {
            const id = confirmRemoveId;
            setConfirmRemoveId(null);
            void runAction(id, () => remote.remove(id));
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
            void runBulk(() => remote.bulkRemove(selectedIds));
          }}
        />
      )}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  tone = 'default',
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'brand' | 'danger';
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'brand'
      ? 'text-brand hover:bg-brandsoft'
      : tone === 'danger'
        ? 'text-red-500 hover:bg-red-50'
        : 'text-ink hover:bg-surface';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function EmptyRow({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-card py-16 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
        {icon}
      </div>
      <p className="text-[14.5px] text-ink">{title}</p>
    </div>
  );
}
