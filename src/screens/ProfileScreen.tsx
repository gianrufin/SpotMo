import {
  Heart,
  PlusCircle,
  ShieldCheck,
  Users,
  Bell,
  Info,
  ChevronRight,
  RotateCcw,
  Download,
  CheckCircle2,
  Sun,
  Moon,
  SunMoon,
  Store,
  Clock,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';
import type { ThemePref } from '../lib/useTheme';

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: SunMoon },
];

export type ProfileRole =
  | 'signed-out'
  | 'loading'
  | 'admin'
  | 'organizer'
  | 'pending'
  | 'revoked'
  | 'not-requested';

interface ProfileScreenProps {
  role: ProfileRole;
  email: string | null;
  organizerName: string;
  savedCount: number;
  submissionCount: number;
  pendingCount: number;
  onOpenOrganizer: () => void;
  onOpenAdmin: () => void;
  onOpenOrganizersManager?: () => void;
  onSignOut: () => void;
  onResetOnboarding: () => void;
  canInstall: boolean;
  installed: boolean;
  onInstall: () => void;
  themePref: ThemePref;
  onSetTheme: (pref: ThemePref) => void;
  remindersEnabled: boolean;
  canNotify: boolean;
  onEnableReminders: () => void;
  onDisableReminders: () => void;
  adminNotificationsEnabled: boolean;
  canAdminNotify: boolean;
  onEnableAdminNotifications: () => void;
  onDisableAdminNotifications: () => void;
}

export function ProfileScreen({
  role,
  email,
  organizerName,
  savedCount,
  submissionCount,
  pendingCount,
  onOpenOrganizer,
  onOpenAdmin,
  onOpenOrganizersManager,
  onSignOut,
  onResetOnboarding,
  canInstall,
  installed,
  remindersEnabled,
  canNotify,
  onEnableReminders,
  onDisableReminders,
  adminNotificationsEnabled,
  canAdminNotify,
  onEnableAdminNotifications,
  onDisableAdminNotifications,
  onInstall,
  themePref,
  onSetTheme,
}: ProfileScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-2 pt-6">
        <h1 className="font-serif text-[32px] leading-none text-ink">Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* Guest card — fixed premium dark gradient (same in both themes) */}
        <div className="mt-3 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#2A2140] to-[#14101E] p-5 text-white shadow-card ring-1 ring-white/5">
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
          <div className="rounded-3xl bg-card p-4 shadow-soft">
            <p className="font-serif text-3xl text-ink">{savedCount}</p>
            <p className="text-[12px] text-muted">Saved events</p>
          </div>
          <div className="rounded-3xl bg-card p-4 shadow-soft">
            <p className="font-serif text-3xl text-ink">{submissionCount}</p>
            <p className="text-[12px] text-muted">Your submissions</p>
          </div>
        </div>

        {/* Install prompt */}
        {canInstall && (
          <button
            onClick={onInstall}
            className="mt-4 flex w-full items-center gap-4 rounded-3xl bg-brand p-4 text-left text-white shadow-card transition active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Download size={20} strokeWidth={1.9} />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-lg leading-tight">
                Install SpotMo
              </span>
              <span className="block text-[12.5px] text-white/80">
                Add it to your home screen for one-tap access
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-white/80" />
          </button>
        )}
        {installed && (
          <div className="mt-4 flex items-center gap-3 rounded-3xl bg-brandsoft p-4 text-brandsoftfg">
            <CheckCircle2 size={20} strokeWidth={1.9} />
            <span className="text-[13.5px]">SpotMo is installed on this device.</span>
          </div>
        )}

        {/* Appearance */}
        <div className="mt-6">
          <p className="px-1 pb-2.5 text-[12px] uppercase tracking-wide text-muted">
            Appearance
          </p>
          <div className="flex gap-1.5 rounded-full bg-surface p-1">
            {THEME_OPTIONS.map((opt) => {
              const active = themePref === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => onSetTheme(opt.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] transition ${
                    active ? 'bg-card text-ink shadow-soft' : 'text-muted'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.9} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Organizer / admin — one clear sign-in section per role */}
        <div className="mt-6 space-y-2.5">
          <p className="px-1 text-[12px] uppercase tracking-wide text-muted">
            {role === 'admin'
              ? 'Admin'
              : role === 'organizer'
                ? 'Organizer'
                : 'Organizers & Admins'}
          </p>

          {(role === 'signed-out' || role === 'loading') && (
            <>
              <Row
                icon={<Store size={19} strokeWidth={1.8} />}
                title="Want to be an organizer?"
                subtitle="Submit your email for admin approval"
                onClick={onOpenOrganizer}
              />
              <Row
                icon={<ShieldCheck size={19} strokeWidth={1.8} />}
                title="Sign in as admin"
                subtitle="Approve events and manage organizers"
                onClick={onOpenAdmin}
              />
            </>
          )}

          {role === 'admin' && (
            <>
              <p className="px-1 text-[12px] text-muted">
                Signed in{email ? ` as ${email}` : ''}
              </p>
              <Row
                icon={<ShieldCheck size={19} strokeWidth={1.8} />}
                title="Moderation queue"
                subtitle={
                  pendingCount > 0
                    ? `${pendingCount} awaiting review`
                    : 'Approve, edit, or decline submitted events'
                }
                badge={pendingCount > 0 ? pendingCount : undefined}
                onClick={onOpenAdmin}
              />
              {onOpenOrganizersManager && (
                <Row
                  icon={<Users size={19} strokeWidth={1.8} />}
                  title="Manage organizers"
                  subtitle="Approve, decline, revoke, add, or edit organizers"
                  onClick={onOpenOrganizersManager}
                />
              )}
              <Row
                icon={<PlusCircle size={19} strokeWidth={1.8} />}
                title="My events"
                subtitle="Add and edit your own events"
                onClick={onOpenOrganizer}
              />
              <Row
                icon={<Bell size={19} strokeWidth={1.8} />}
                title="Notify me of new submissions"
                subtitle={
                  !canAdminNotify
                    ? 'Not supported on this browser'
                    : adminNotificationsEnabled
                      ? 'On — alerts for new events and organizer requests'
                      : 'Get a notification when someone submits something'
                }
                disabled={!canAdminNotify}
                onClick={
                  canAdminNotify
                    ? adminNotificationsEnabled
                      ? onDisableAdminNotifications
                      : onEnableAdminNotifications
                    : undefined
                }
                badge={adminNotificationsEnabled ? 'On' : undefined}
              />
              <Row
                icon={<LogOut size={19} strokeWidth={1.8} />}
                title="Sign out"
                subtitle={organizerName}
                onClick={onSignOut}
              />
            </>
          )}

          {role === 'organizer' && (
            <>
              <Row
                icon={<PlusCircle size={19} strokeWidth={1.8} />}
                title="Organizer dashboard"
                subtitle="Add, edit, and track your events"
                onClick={onOpenOrganizer}
              />
              <Row
                icon={<LogOut size={19} strokeWidth={1.8} />}
                title="Sign out"
                subtitle={organizerName}
                onClick={onSignOut}
              />
            </>
          )}

          {(role === 'pending' || role === 'revoked' || role === 'not-requested') && (
            <>
              <Row
                icon={
                  role === 'pending' ? (
                    <Clock size={19} strokeWidth={1.8} />
                  ) : role === 'revoked' ? (
                    <ShieldAlert size={19} strokeWidth={1.8} />
                  ) : (
                    <Store size={19} strokeWidth={1.8} />
                  )
                }
                title="Organizer access"
                subtitle={
                  role === 'pending'
                    ? 'Your request is awaiting admin review'
                    : role === 'revoked'
                      ? 'Your organizer access was revoked'
                      : "You haven't requested organizer access yet"
                }
                onClick={onOpenOrganizer}
              />
              <Row
                icon={<ShieldCheck size={19} strokeWidth={1.8} />}
                title="Sign in as admin"
                subtitle="Approve events and manage organizers"
                onClick={onOpenAdmin}
              />
              <Row
                icon={<LogOut size={19} strokeWidth={1.8} />}
                title="Sign out"
                subtitle={email ?? 'Sign out of this account'}
                onClick={onSignOut}
              />
            </>
          )}
        </div>

        <div className="mt-6 space-y-2.5">
          <p className="px-1 text-[12px] uppercase tracking-wide text-muted">
            Preferences
          </p>
          <Row
            icon={<Bell size={19} strokeWidth={1.8} />}
            title="Reminders for saved events"
            subtitle={
              !canNotify
                ? 'Not supported on this browser'
                : remindersEnabled
                  ? 'On — notifies you shortly before it starts'
                  : 'Get notified shortly before a saved event starts'
            }
            disabled={!canNotify}
            onClick={
              canNotify
                ? remindersEnabled
                  ? onDisableReminders
                  : onEnableReminders
                : undefined
            }
            badge={remindersEnabled ? 'On' : undefined}
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
  badge?: number | string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3.5 rounded-3xl bg-card p-4 text-left shadow-soft transition ${
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
