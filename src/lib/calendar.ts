import type { SpotEvent } from '../types';
import { eventEndMoment } from './format';

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeText(text: string): string {
  return text.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
}

/** Builds a minimal, valid .ics calendar file for one event. */
export function buildIcsContent(event: SpotEvent): string {
  const start = new Date(event.startsAt);
  const end = eventEndMoment(event);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SpotMo//Event//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@spotmo`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(`${event.venue}, ${event.address}`)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function icsFileName(event: SpotEvent): string {
  return `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
}

/** data: URL so the file can be offered as a plain download link, no backend. */
export function buildIcsDataUrl(event: SpotEvent): string {
  const content = buildIcsContent(event);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}
