import { Map, Heart, Compass, User } from 'lucide-react';
import type { Tab } from '../types';
import { useRipple } from '../lib/useRipple';
import { RippleLayer } from '../components/common/RippleLayer';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  savedCount?: number;
}

const ITEMS: { id: Tab; label: string; icon: typeof Map }[] = [
  { id: 'map', label: 'Map', icon: Map },
  { id: 'saved', label: 'Saved', icon: Heart },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'profile', label: 'Profile', icon: User },
];

export function BottomNav({ active, onChange, savedCount = 0 }: BottomNavProps) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4 pt-2">
      <div className="glass mx-auto flex items-center justify-around rounded-full px-2 py-2 shadow-card">
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <NavItem
            key={id}
            id={id}
            label={label}
            Icon={Icon}
            isActive={active === id}
            badge={id === 'saved' ? savedCount : 0}
            onClick={() => onChange(id)}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  label,
  Icon,
  isActive,
  badge,
  onClick,
}: {
  id: Tab;
  label: string;
  Icon: typeof Map;
  isActive: boolean;
  badge: number;
  onClick: () => void;
}) {
  const { ripples, onPointerDown } = useRipple();

  return (
    <button
      onClick={onClick}
      onPointerDown={onPointerDown}
      className="ripple-host relative flex flex-1 flex-col items-center gap-1 rounded-full py-1.5 transition-colors"
      aria-label={label}
      aria-current={isActive}
    >
      <RippleLayer ripples={ripples} />
      <span className="relative">
        {/* Material active-indicator pill, behind the icon only */}
        <span
          className={`absolute left-1/2 top-1/2 h-8 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ${
            isActive ? 'scale-100 bg-secondarysoft opacity-100' : 'scale-75 opacity-0'
          }`}
        />
        <Icon
          size={22}
          strokeWidth={isActive ? 2.2 : 1.6}
          className={`relative ${isActive ? 'text-secondarysoftfg' : 'text-muted'}`}
          fill={isActive && label === 'Saved' ? 'currentColor' : 'none'}
        />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tertiary px-1 text-[9px] font-medium text-ontertiary">
            {badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] ${isActive ? 'text-ink' : 'text-muted'}`}>{label}</span>
    </button>
  );
}
