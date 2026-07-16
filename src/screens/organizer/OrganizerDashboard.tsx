import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Eye,
  Heart,
  MousePointerClick,
  TrendingUp,
} from 'lucide-react';
import type { Submission, SubmissionStatus } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { SegmentedTabs } from '../../components/common/SegmentedTabs';
import { EmptyState } from '../../components/common/EmptyState';
import { formatShortDate } from '../../lib/format';
import { categoryLabel } from '../../data/categories';

interface OrganizerDashboardProps {
  organizerName: string;
  submissions: Submission[];
  onBack: () => void;
  onCreate: () => void;
  onSignOut?: () => void;
}

// Deterministic pseudo-metrics per event id, so numbers are stable across renders
// (stands in for real analytics until a backend is wired up).
function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function metricsFor(s: Submission) {
  const seed = hashSeed(s.id);
  // rejected/pending events see fewer views than approved ones
  const scale = s.status === 'approved' ? 1 : s.status === 'pending' ? 0.35 : 0.15;
  const views = Math.round((300 + (seed % 2200)) * scale);
  const saves = Math.round((20 + ((seed >> 3) % 380)) * scale);
  const clicks = Math.round((30 + ((seed >> 6) % 600)) * scale);
  return { views, saves, clicks };
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
}: OrganizerDashboardProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    return {
      total: submissions.length,
      approved: submissions.filter((s) => s.status === 'approved').length,
      pending: submissions.filter((s) => s.status === 'pending').length,
    };
  }, [submissions]);

  const totals = useMemo(() => {
    return submissions.reduce(
      (acc, s) => {
        const m = metricsFor(s);
        acc.views += m.views;
        acc.saves += m.saves;
        acc.clicks += m.clicks;
        return acc;
      },
      { views: 0, saves: 0, clicks: 0 },
    );
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

  // deterministic 7-day trend bars from aggregate views
  const trend = useMemo(() => {
    const base = totals.views || 8;
    return Array.from({ length: 7 }, (_, i) => {
      const s = hashSeed(`d${i}-${base}`);
      return 0.3 + ((s % 70) / 100);
    });
  }, [totals.views]);

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
          <p className="truncate font-serif text-xl leading-none text-ink">
            {greeting}, {organizerName}
          </p>
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

        {/* Analytics */}
        <div className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-serif text-xl text-ink">Performance</p>
              <p className="text-[12px] text-muted">Last 7 days</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-brandsoft px-2.5 py-1 text-[12px] text-brandsoftfg">
              <TrendingUp size={13} strokeWidth={2} /> Live
            </span>
          </div>

          {/* trend bars */}
          <div className="flex h-20 items-end gap-1.5">
            {trend.map((t, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-brand/80"
                style={{ height: `${Math.round(t * 100)}%` }}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
            <Metric icon={<Eye size={16} />} label="Views" value={totals.views} />
            <Metric icon={<Heart size={16} />} label="Saves" value={totals.saves} />
            <Metric
              icon={<MousePointerClick size={16} />}
              label="Clicks"
              value={totals.clicks}
            />
          </div>
        </div>

        {/* My events */}
        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">My Events</h2>
        </div>
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
            list.map((s) => {
              const m = metricsFor(s);
              return (
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
                    <div className="mt-0.5 flex gap-3 text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {m.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={12} /> {m.saves}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
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

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-muted">{icon}</span>
      <p className="font-serif text-xl text-ink">{value.toLocaleString()}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
