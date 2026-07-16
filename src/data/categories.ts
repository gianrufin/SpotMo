import type { Category } from '../types';
import {
  Music,
  Palette,
  Mic2,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryDef {
  id: Category;
  label: string;
  icon: LucideIcon;
  /** representative photo for the category browse grid */
  image: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'music',
    label: 'Live Music',
    icon: Music,
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'art',
    label: 'Art',
    icon: Palette,
    image:
      'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'comedy',
    label: 'Comedy',
    icon: Mic2,
    image:
      'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'market',
    label: 'Market',
    icon: ShoppingBag,
    image:
      'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'community',
    label: 'Community',
    icon: Users,
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'food',
    label: 'Food',
    icon: UtensilsCrossed,
    image:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=70',
  },
];

export const CATEGORY_MAP: Record<Category, CategoryDef> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<Category, CategoryDef>,
);

export function categoryLabel(id: Category): string {
  return CATEGORY_MAP[id]?.label ?? id;
}
