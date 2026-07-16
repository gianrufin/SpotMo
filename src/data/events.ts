import type { SpotEvent } from '../types';

/**
 * Launch data: no seed/sample events. Every pin on the map comes from a real,
 * admin-approved organizer submission (see lib/useRemoteEvents.ts).
 */
export const EVENTS: SpotEvent[] = [];

export function getEventById(
  id: string,
  extra: SpotEvent[] = [],
): SpotEvent | undefined {
  return [...EVENTS, ...extra].find((e) => e.id === id);
}
