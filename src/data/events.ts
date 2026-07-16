import type { SpotEvent, Category } from '../types';

/**
 * Curated seed events across the Philippines. Dates are expressed as an offset
 * in days from "today" (computed at load time) so the map always shows a healthy
 * mix of Today / Tomorrow / This week / Later pins whenever the app is opened.
 */
interface Seed {
  id: string;
  title: string;
  category: Category;
  posterUrl: string;
  lat: number;
  lng: number;
  venue: string;
  address: string;
  city: string;
  dayOffset: number;
  time: string; // "HH:MM" 24h local
  durationH?: number;
  priceLabel: string;
  isFree: boolean;
  description: string;
  lineup?: string[];
  highlights?: string[];
  ticketUrl?: string;
  organizer?: string;
}

function buildDate(dayOffset: number, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const SEEDS: Seed[] = [
  {
    id: 'indie-night-saguijo',
    title: 'Indie Night',
    category: 'music',
    posterUrl:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=75',
    lat: 14.5547,
    lng: 121.0244,
    venue: 'saGuijo Café + Bar',
    address: '7612 Guijo St, San Antonio, Makati City',
    city: 'Makati',
    dayOffset: 0,
    time: '20:00',
    durationH: 4,
    priceLabel: '₱300',
    isFree: false,
    description:
      'An intimate night of raw indie sound from the Manila underground. Doors open at 8PM — come early, the room fills up fast.',
    lineup: ['The Ridleys', 'Halina', 'Basement Tapes', 'Cerra'],
    highlights: ['Live indie music', 'Great drinks', 'Good vibes'],
    ticketUrl: 'https://example.com/tickets/indie-night',
    organizer: 'saGuijo Presents',
  },
  {
    id: 'poblacion-night-market',
    title: 'Poblacion Night Market',
    category: 'market',
    posterUrl:
      'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=75',
    lat: 14.5661,
    lng: 121.0294,
    venue: 'Poblacion Open Grounds',
    address: 'Polaris St, Poblacion, Makati City',
    city: 'Makati',
    dayOffset: 0,
    time: '18:00',
    durationH: 6,
    priceLabel: 'Free',
    isFree: true,
    description:
      'Street food, thrift finds, and local makers under the city lights. Bring cash, bring friends, bring an appetite.',
    highlights: ['Street food', 'Local makers', 'Free entry'],
    organizer: 'Poblacion Collective',
  },
  {
    id: 'cubao-comedy-cartel',
    title: 'Comedy Cartel Live',
    category: 'comedy',
    posterUrl:
      'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?auto=format&fit=crop&w=900&q=75',
    lat: 14.6199,
    lng: 121.0536,
    venue: 'The Mad Room',
    address: 'Cubao Expo, General Romulo Ave, Quezon City',
    city: 'Quezon City',
    dayOffset: 1,
    time: '21:00',
    durationH: 2,
    priceLabel: '₱250',
    isFree: false,
    description:
      'The sharpest stand-up lineup in QC. An open bar, a small room, and no filter. 18+ only.',
    lineup: ['Alex Cruz', 'Mimi Reyes', 'Jborge', 'The Late Set'],
    highlights: ['Stand-up comedy', 'Open bar', '18+ show'],
    ticketUrl: 'https://example.com/tickets/comedy-cartel',
    organizer: 'Comedy Cartel MNL',
  },
  {
    id: 'escolta-art-walk',
    title: 'Escolta Art Walk',
    category: 'art',
    posterUrl:
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=75',
    lat: 14.5972,
    lng: 120.9797,
    venue: 'First United Building',
    address: 'Escolta St, Binondo, Manila',
    city: 'Manila',
    dayOffset: 1,
    time: '16:00',
    durationH: 5,
    priceLabel: 'Free',
    isFree: true,
    description:
      'Heritage halls turned gallery. Wander through works from a new wave of Filipino visual artists in the heart of old Manila.',
    highlights: ['Local artists', 'Heritage venue', 'Free entry'],
    organizer: 'HUB: Make Lab',
  },
  {
    id: 'bgc-jazz-rooftop',
    title: 'Rooftop Jazz Sessions',
    category: 'music',
    posterUrl:
      'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?auto=format&fit=crop&w=900&q=75',
    lat: 14.5509,
    lng: 121.0513,
    venue: 'The Alley Rooftop',
    address: '9th Ave cor 28th St, BGC, Taguig',
    city: 'Taguig',
    dayOffset: 2,
    time: '19:30',
    durationH: 3,
    priceLabel: '₱650',
    isFree: false,
    description:
      'Golden hour, a skyline view, and a live quartet. Smooth jazz to close out your week above the city.',
    lineup: ['Manila Jazz Quartet', 'Sofia Lim'],
    highlights: ['Skyline view', 'Live jazz', 'Craft cocktails'],
    ticketUrl: 'https://example.com/tickets/rooftop-jazz',
    organizer: 'The Alley',
  },
  {
    id: 'qc-makers-market',
    title: 'Maginhawa Makers Market',
    category: 'market',
    posterUrl:
      'https://images.unsplash.com/photo-1524650359799-842906ca1c06?auto=format&fit=crop&w=900&q=75',
    lat: 14.6398,
    lng: 121.0559,
    venue: 'Maginhawa Grounds',
    address: 'Maginhawa St, Teachers Village, Quezon City',
    city: 'Quezon City',
    dayOffset: 3,
    time: '10:00',
    durationH: 8,
    priceLabel: 'Free',
    isFree: true,
    description:
      'A weekend market for local ceramics, prints, plants, and small-batch everything. Family and pet friendly.',
    highlights: ['Local crafts', 'Pet friendly', 'Free entry'],
    organizer: 'Maginhawa Community',
  },
  {
    id: 'intramuros-food-crawl',
    title: 'Intramuros Food Crawl',
    category: 'food',
    posterUrl:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=75',
    lat: 14.5906,
    lng: 120.9754,
    venue: 'Plaza San Luis',
    address: 'General Luna St, Intramuros, Manila',
    city: 'Manila',
    dayOffset: 3,
    time: '17:00',
    durationH: 4,
    priceLabel: '₱1,200',
    isFree: false,
    description:
      'A guided walk through the walled city, tasting Filipino heritage dishes at five hidden stops. Includes all food.',
    highlights: ['5 tasting stops', 'Heritage food', 'Guided tour'],
    ticketUrl: 'https://example.com/tickets/food-crawl',
    organizer: 'Manila Eats',
  },
  {
    id: 'antipolo-sunrise-run',
    title: 'Sunrise Community Run',
    category: 'community',
    posterUrl:
      'https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=900&q=75',
    lat: 14.5865,
    lng: 121.176,
    venue: 'Cloud 9 Viewpoint',
    address: 'Sumulong Highway, Antipolo, Rizal',
    city: 'Antipolo',
    dayOffset: 4,
    time: '05:30',
    durationH: 3,
    priceLabel: 'Free',
    isFree: true,
    description:
      'A slow 5K up to the ridge for the sunrise, then coffee. All paces welcome — this is about the view, not the clock.',
    highlights: ['5K route', 'Sunrise view', 'Free coffee'],
    organizer: 'Rizal Runners',
  },
  {
    id: 'makati-vinyl-fair',
    title: 'Vinyl & Coffee Fair',
    category: 'market',
    posterUrl:
      'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=900&q=75',
    lat: 14.5606,
    lng: 121.0184,
    venue: 'Warehouse Eight',
    address: 'La Fuerza Compound, Chino Roces Ave, Makati',
    city: 'Makati',
    dayOffset: 5,
    time: '12:00',
    durationH: 7,
    priceLabel: '₱100',
    isFree: false,
    description:
      'Crate-dig through rare pressings, sip single-origin brews, and catch DJ sets all afternoon.',
    lineup: ['DJ Similarobjects', 'Owfuck', 'Vinyl heads'],
    highlights: ['Rare vinyl', 'Specialty coffee', 'DJ sets'],
    ticketUrl: 'https://example.com/tickets/vinyl-fair',
    organizer: 'Warehouse Eight',
  },
  {
    id: 'cebu-itpark-sessions',
    title: 'IT Park Live Sessions',
    category: 'music',
    posterUrl:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=75',
    lat: 10.3286,
    lng: 123.9058,
    venue: 'The Company Cinema',
    address: 'Cebu IT Park, Apas, Cebu City',
    city: 'Cebu City',
    dayOffset: 4,
    time: '20:00',
    durationH: 4,
    priceLabel: '₱400',
    isFree: false,
    description:
      'Cebu’s best emerging bands on one stage. A loud, joyful night for the south’s growing scene.',
    lineup: ['Nathan & Mercury', 'Faspitch', 'Kurokawa'],
    highlights: ['Live bands', 'Local scene', 'Merch booths'],
    ticketUrl: 'https://example.com/tickets/cebu-sessions',
    organizer: 'Cebu Live Co.',
  },
  {
    id: 'cebu-heritage-art',
    title: 'Colon Heritage Exhibit',
    category: 'art',
    posterUrl:
      'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=900&q=75',
    lat: 10.2965,
    lng: 123.9019,
    venue: 'Museo Sugbo',
    address: 'MJ Cuenco Ave, Cebu City',
    city: 'Cebu City',
    dayOffset: 6,
    time: '09:00',
    durationH: 8,
    priceLabel: '₱75',
    isFree: false,
    description:
      'A photo and painting exhibit tracing the life of Cebu’s oldest street. Curated by local historians.',
    highlights: ['Photo exhibit', 'Local history', 'Guided tours'],
    ticketUrl: 'https://example.com/tickets/colon-exhibit',
    organizer: 'Museo Sugbo',
  },
  {
    id: 'davao-riverside-market',
    title: 'Riverside Weekend Market',
    category: 'food',
    posterUrl:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=75',
    lat: 7.0731,
    lng: 125.6128,
    venue: 'Roxas Night Market',
    address: 'Roxas Ave, Davao City',
    city: 'Davao City',
    dayOffset: 5,
    time: '17:30',
    durationH: 6,
    priceLabel: 'Free',
    isFree: true,
    description:
      'Grilled everything, fresh fruit, and the warmest crowd in Mindanao. A Davao institution.',
    highlights: ['Grilled street food', 'Fresh fruit', 'Free entry'],
    organizer: 'Davao City Tourism',
  },
  {
    id: 'baguio-session-road',
    title: 'Session Road Sound',
    category: 'music',
    posterUrl:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=75',
    lat: 16.4118,
    lng: 120.5972,
    venue: 'Tam-awan Village',
    address: 'Pinsao Proper, Baguio City',
    city: 'Baguio City',
    dayOffset: 7,
    time: '18:00',
    durationH: 4,
    priceLabel: '₱350',
    isFree: false,
    description:
      'Folk and acoustic acts among the cordillera huts, fog rolling in. Bring a jacket — it gets cold up here.',
    lineup: ['The Ransom Collective', 'Fools and Foes'],
    highlights: ['Acoustic sets', 'Mountain air', 'Bonfire'],
    ticketUrl: 'https://example.com/tickets/session-road',
    organizer: 'Tam-awan Arts',
  },
  {
    id: 'baguio-arts-fair',
    title: 'Cordillera Arts Fair',
    category: 'art',
    posterUrl:
      'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&w=900&q=75',
    lat: 16.4095,
    lng: 120.5989,
    venue: 'BenCab Museum',
    address: 'Km 6 Asin Rd, Tuba, Benguet',
    city: 'Baguio City',
    dayOffset: 9,
    time: '10:00',
    durationH: 7,
    priceLabel: '₱150',
    isFree: false,
    description:
      'Weavers, carvers, and painters from across the highlands share their craft in a single open-air fair.',
    highlights: ['Indigenous crafts', 'Live weaving', 'Workshops'],
    ticketUrl: 'https://example.com/tickets/cordillera-fair',
    organizer: 'BenCab Museum',
  },
  {
    id: 'qc-open-mic',
    title: 'Cubao Open Mic',
    category: 'community',
    posterUrl:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=75',
    lat: 14.6229,
    lng: 121.0559,
    venue: 'Route 196',
    address: '196-A Katipunan Ave Ext, Quezon City',
    city: 'Quezon City',
    dayOffset: 2,
    time: '19:00',
    durationH: 3,
    priceLabel: 'Free',
    isFree: true,
    description:
      'Sign up at the door — poets, singers, and first-timers all get five minutes and a warm room.',
    highlights: ['Open sign-up', 'All welcome', 'Free entry'],
    organizer: 'Route 196',
  },
  {
    id: 'pasig-plant-market',
    title: 'Pasig Plant Market',
    category: 'market',
    posterUrl:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=75',
    lat: 14.5764,
    lng: 121.0851,
    venue: 'The Grove Grounds',
    address: 'E. Rodriguez Jr. Ave, Pasig City',
    city: 'Pasig',
    dayOffset: 6,
    time: '08:00',
    durationH: 6,
    priceLabel: 'Free',
    isFree: true,
    description:
      'Rare aroids, succulents, and pottery from home growers. Come early for the good ones.',
    highlights: ['Rare plants', 'Home growers', 'Free entry'],
    organizer: 'Manila Plantitos',
  },
  {
    id: 'makati-comedy-basement',
    title: 'Basement Comedy',
    category: 'comedy',
    posterUrl:
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=900&q=75',
    lat: 14.5645,
    lng: 121.0299,
    venue: 'Prohibition',
    address: 'Don Pedro St, Poblacion, Makati',
    city: 'Makati',
    dayOffset: 8,
    time: '20:30',
    durationH: 2,
    priceLabel: '₱500',
    isFree: false,
    description:
      'A speakeasy, a two-drink minimum, and a rotating cast of the country’s funniest. Reservations recommended.',
    lineup: ['GB Labrador', 'Red Ollero', 'Surprise headliner'],
    highlights: ['Speakeasy vibe', 'Two-drink min', 'Late show'],
    ticketUrl: 'https://example.com/tickets/basement-comedy',
    organizer: 'Prohibition MNL',
  },
  {
    id: 'taguig-food-fest',
    title: 'Mercato Food Festival',
    category: 'food',
    posterUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=75',
    lat: 14.5486,
    lng: 121.0509,
    venue: 'BGC Amphitheater',
    address: '26th St, BGC, Taguig',
    city: 'Taguig',
    dayOffset: 10,
    time: '16:00',
    durationH: 7,
    priceLabel: '₱200',
    isFree: false,
    description:
      'Fifty of the metro’s best food stalls in one place, plus live music through the evening.',
    highlights: ['50+ food stalls', 'Live music', 'Family friendly'],
    ticketUrl: 'https://example.com/tickets/mercato',
    organizer: 'Mercato Centrale',
  },
];

export const EVENTS: SpotEvent[] = SEEDS.map((s) => {
  const startsAt = buildDate(s.dayOffset, s.time);
  const endsAt = s.durationH
    ? new Date(new Date(startsAt).getTime() + s.durationH * 3600_000).toISOString()
    : undefined;
  const { dayOffset: _d, time: _t, durationH: _dur, ...rest } = s;
  return { ...rest, startsAt, endsAt };
});

export function getEventById(
  id: string,
  extra: SpotEvent[] = [],
): SpotEvent | undefined {
  return [...EVENTS, ...extra].find((e) => e.id === id);
}
