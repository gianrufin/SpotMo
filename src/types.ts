export type Category =
  | 'music'
  | 'art'
  | 'comedy'
  | 'market'
  | 'community'
  | 'food';

export type DateBucket = 'today' | 'tomorrow' | 'week' | 'later';

export interface SpotEvent {
  id: string;
  title: string;
  category: Category;
  posterUrl: string;
  lat: number;
  lng: number;
  venue: string;
  address: string;
  city: string;
  /** ISO datetime */
  startsAt: string;
  /** ISO datetime (optional) */
  endsAt?: string;
  priceLabel: string; // "Free" | "₱300" | "₱500–₱1,200"
  isFree: boolean;
  description: string;
  /** performer / lineup names — plain text, no profile pages */
  lineup?: string[];
  highlights?: string[];
  /** external ticket link (optional) */
  ticketUrl?: string;
  organizer?: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission extends SpotEvent {
  status: SubmissionStatus;
  submittedAt: string;
  submittedBy: string;
}

export type Tab = 'map' | 'saved' | 'discover' | 'profile';

export interface EventFilters {
  query: string;
  date: DateBucket | null;
  category: Category | null;
  price: 'free' | 'paid' | null;
}
