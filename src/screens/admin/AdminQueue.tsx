import { useState } from 'react';
import { ArrowLeft, Check, X, Trash2, ShieldCheck, Inbox } from 'lucide-react';
import type { Submission, SubmissionStatus } from '../../types';
import { SegmentedTabs } from '../../components/common/SegmentedTabs';
import { EmptyState } from '../../components/common/EmptyState';
import { formatShortDate } from '../../lib/format';
import { categoryLabel } from '../../data/categories';

interface AdminQueueProps {
  submissions: Submission[];
  onBack: () => void;
  onSetStatus: (id: string, status: SubmissionStatus) => void;
  onRemove: (id: string) => void;
}

type Filter = 'pending' | 'approved' | 'rejected';

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-brand-50 text-brand-700',
  rejected: 'bg-red-100 text-red-600',
};

export function AdminQueue({
  submissions,
  onBack,
  onSetStatus,
  onRemove,
}: AdminQueueProps) {
  const [filter, setFilter] = useState<Filter>('pending');
  const list = submissions.filter((s) => s.status === filter);
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft size={19} strokeWidth={1.9} />
        </button>
        <div>
          <p className="font-serif text-xl leading-none text-ink">
            Moderation queue
          </p>
          <p className="text-[12px] text-muted">
            {pendingCount} awaiting review
          </p>
        </div>
      </header>

      <div className="px-5 py-3">
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {submissions.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={26} strokeWidth={1.6} />}
            title="Queue is clear"
            message="Events submitted by organizers show up here for review before going live."
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Inbox size={26} strokeWidth={1.6} />}
            title={`No ${filter} events`}
            message="Switch tabs to see events in other states."
          />
        ) : (
          <div className="space-y-3 pt-1">
            {list.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-3xl bg-white shadow-soft">
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
                    <h3 className="truncate font-serif text-lg leading-tight text-ink">
                      {s.title}
                    </h3>
                    <p className="truncate text-[12px] text-muted">
                      {formatShortDate(s.startsAt)}
                    </p>
                    <p className="truncate text-[12px] text-muted">
                      {s.venue} · by {s.submittedBy}
                    </p>
                  </div>
                </div>

                <div className="flex border-t border-hairline">
                  {s.status !== 'approved' && (
                    <button
                      onClick={() => onSetStatus(s.id, 'approved')}
                      className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[13px] text-brand transition active:bg-brand-50"
                    >
                      <Check size={16} strokeWidth={2.2} /> Approve
                    </button>
                  )}
                  {s.status !== 'rejected' && (
                    <button
                      onClick={() => onSetStatus(s.id, 'rejected')}
                      className="flex flex-1 items-center justify-center gap-1.5 border-l border-hairline py-3 text-[13px] text-muted transition active:bg-surface"
                    >
                      <X size={16} strokeWidth={2.2} /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(s.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-hairline py-3 text-[13px] text-red-500 transition active:bg-red-50"
                  >
                    <Trash2 size={16} strokeWidth={1.9} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
