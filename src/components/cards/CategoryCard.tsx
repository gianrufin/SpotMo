import type { CategoryDef } from '../../data/categories';

interface CategoryCardProps {
  category: CategoryDef;
  count?: number;
  onClick: () => void;
}

export function CategoryCard({ category, count, onClick }: CategoryCardProps) {
  const Icon = category.icon;
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/3] overflow-hidden rounded-3xl text-left shadow-soft transition-all duration-150 active:scale-[0.98]"
    >
      <img
        src={category.image}
        alt={category.label}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover saturate-[0.55] contrast-[0.95] brightness-[0.97] transition-transform duration-300 group-hover:scale-105"
      />
      {/* Flat, muted brand wash — keeps every category photo consistent
          regardless of how vibrant the source photo is. */}
      <div className="absolute inset-0 bg-brand/20 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#111827] backdrop-blur">
        <Icon size={16} strokeWidth={1.9} />
      </div>
      <div className="absolute inset-x-3 bottom-3">
        <p className="font-serif text-lg leading-tight text-white">
          {category.label}
        </p>
        {count !== undefined && (
          <p className="text-[11px] text-white/80">{count} events</p>
        )}
      </div>
    </button>
  );
}
