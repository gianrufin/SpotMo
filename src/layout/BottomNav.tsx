import { Map, Heart, Compass, User } from 'lucide-react';
import type { Tab } from '../types';

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
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 transition-colors"
              aria-label={label}
              aria-current={isActive}
            >
              <span className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className={isActive ? 'text-brand' : 'text-muted'}
                  fill={id === 'saved' && isActive ? '#2F7D5A' : 'none'}
                />
                {id === 'saved' && savedCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-medium text-white">
                    {savedCount}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] ${isActive ? 'text-ink' : 'text-muted'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
