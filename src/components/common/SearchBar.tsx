import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search events, venues, artists',
  onFocus,
  onBlur,
  autoFocus,
  className = '',
}: SearchBarProps) {
  return (
    <label
      className={`flex items-center gap-2.5 rounded-full glass px-4 py-3 shadow-soft ${className}`}
    >
      <Search size={18} className="shrink-0 text-muted" strokeWidth={1.75} />
      <input
        value={value}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="shrink-0 text-muted transition-colors hover:text-ink"
          aria-label="Clear search"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      )}
    </label>
  );
}
