import {
  Heart,
  PlusCircle,
  ShieldCheck,
  Bell,
  Info,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';

interface ProfileScreenProps {
  savedCount: number;
  submissionCount: number;
  pendingCount: number;
  onOpenOrganizer: () => void;
  onOpenAdmin: () => void;
  onResetOnboarding: () => void;
}

export function ProfileScreen({
  savedCount,
  submissionCount,
  pendingCount,
  onOpenOrganizer,
  onOpenAdmin,
  onResetOnboarding,
}: ProfileScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-2 pt-6">
        <h1 className="font-serif text-[32px] leading-none text-ink">Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* Guest card */}
        <div className="mt-3 flex items-center gap-4 rounded-3xl bg-ink p-5 text-white shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">
            🎧
          </div>
          <div>
            <p className="font-serif text-2xl leading-tight">Local Explorer</p>
            <p className="text-[13px] text-white/60">
              Browsing as guest · Metro Manila
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-serif text-3xl text-ink">{savedCount}</p>
            <p className="text-[12px] text-muted">Saved events</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="font-serif text-3xl text-ink">{submissionCount}</p>
            <p className="text-[12px] text-muted">Your submissions</p>
          </div>
        </div>

        {/* Organizer / admin */}
        <div className="mt-6 space-y-2.5">
          <p className="px-1 text-[12px] uppercase tracking-wide text-muted">
            For Organizers
          </p>
          <Row
            icon={<PlusCircle size={19} strokeWidth={1.8} />}
            title="Create an event"
            subtitle="List your gig, show, or market on SpotMo"
            onClick={onOpenOrganizer}
          />
          <Row
            icon={<ShieldCheck size={19} strokeWidth={1.8} />}
            title="Moderation queue"
            subtitle={
              pendingCount > 0
                ? `${pendingCount} awaiting review`
                : 'Review submitted events'
            }
            badge={pendingCount > 0 ? pendingCount : undefined}
            onClick={onOpenAdmin}
          />
        </div>

        <div className="mt-6 space-y-2.5">
          <p className="px-1 text-[12px] uppercase tracking-wide text-muted">
            Preferences
          </p>
          <Row
            icon={<Bell size={19} strokeWidth={1.8} />}
            title="Notifications"
            subtitle="Alerts for saved events — coming soon"
            disabled
          />
          <Row
            icon={<Heart size={19} strokeWidth={1.8} />}
            title="Interests"
            subtitle="Tune your recommendations — coming soon"
            disabled
          />
          <Row
            icon={<RotateCcw size={19} strokeWidth={1.8} />}
            title="Replay onboarding"
            subtitle="See the intro screens again"
            onClick={onResetOnboarding}
          />
          <Row
            icon={<Info size={19} strokeWidth={1.8} />}
            title="About SpotMo"
            subtitle="v0.1 · Building connections, celebrating local"
            disabled
          />
        </div>

        <div className="mt-10 flex flex-col items-center gap-1 pb-4 text-center">
          <Logo size={22} />
          <p className="text-[11px] uppercase tracking-brand text-muted">
            Find it. Save it. Go to it.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3.5 rounded-3xl bg-white p-4 text-left shadow-soft transition ${
        disabled ? 'opacity-55' : 'active:scale-[0.99] hover:shadow-card'
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{title}</span>
        <span className="block truncate text-[12.5px] text-muted">{subtitle}</span>
      </span>
      {badge !== undefined && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-[12px] text-white">
          {badge}
        </span>
      )}
      {!disabled && <ChevronRight size={18} className="shrink-0 text-muted" />}
    </button>
  );
}
