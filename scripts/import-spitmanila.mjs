#!/usr/bin/env node
/**
 * Auto-publish importer: SPIT Manila (linktr.ee/spitmanila) → SpotMo events.
 *
 * Different source, different technique from import-comedymanila.mjs: there's
 * no calendar feed here, and their ticketing platform (Ticketmelon) blocks
 * scripted access to its event-listing API outright. Instead, their Linktree
 * bio page publicly embeds a Next.js __NEXT_DATA__ JSON blob containing every
 * link — including an "UPCOMING SHOWS" section written as freeform text like:
 *   [JUL 25, 2&7PM] "SPIT U: FOODTRIP (Mikit Tana!)" - Angeles Pampanga
 * We regex-parse that human-written bracket/quote format for date, time(s),
 * title, and venue, and take the ticket URL straight from the link itself
 * (an upgrade over the comedymanila feed, which rarely had one per-event).
 *
 * Because this is free-text written by a person (not a structured calendar
 * field), parsing is inherently less certain than ICS — so unlike Comedy
 * Manila, this stays PENDING for admin review rather than auto-approving.
 * See main() / STATUS below before changing that.
 *
 * Runs on a schedule via .github/workflows/import-spitmanila.yml, using the
 * Supabase *service role* key (bypasses RLS; never expose this client-side).
 * Without SUPABASE_SERVICE_ROLE_KEY set, this runs in dry-run mode: it parses
 * and geocodes but only logs — never writes — so it's safe to run locally.
 */

const LINKTREE_URL = 'https://linktr.ee/spitmanila';
const SOURCE_TAG = 'import:linktree-spitmanila';
const ORGANIZER_NAME = 'SPIT Manila';
const CATEGORY = 'comedy';
const STATUS = 'pending'; // freeform-text parsing is less certain than ICS — review before publish
const FALLBACK_POSTER =
  'https://ugc.production.linktr.ee/f21165cb-62ab-46af-a580-1d8f5fc22bb8_4-3-SPIT---Neon-Logo-Green.png';
const MANILA_UTC_OFFSET_HOURS = 8;
const NOMINATIM_UA = 'SpotMo-EventImporter/1.0 (https://gianrufin.github.io/SpotMo/)';

const dryRun = !process.env.SUPABASE_SERVICE_ROLE_KEY;

const MONTHS = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

const BRACKET_RE = /\[([^\]]+)\]/;
const QUOTE_RE = /["“]([^"”]+)["”]/;

function parseClockNumber(digits) {
  // "8" -> 8:00, "730" -> 7:30, "1030" -> 10:30
  if (digits.length <= 2) return { hour: Number(digits), minute: 0 };
  return { hour: Number(digits.slice(0, -2)), minute: Number(digits.slice(-2)) };
}

/** "JUL 25, 2&7PM" / "AUG 12 730PM" -> [{month, day, hour, minute}, ...] —
 * one entry per showtime (a bracket can list more than one, e.g. matinee +
 * evening), sharing the trailing AM/PM across times that omit their own. */
function parseDateTimes(text) {
  const monthDayMatch = /([A-Z]{3})[A-Z]*\.?\s+(\d{1,2})/i.exec(text);
  if (!monthDayMatch) return [];
  const month = MONTHS[monthDayMatch[1].toUpperCase()];
  if (month === undefined) return [];
  const day = Number(monthDayMatch[2]);

  const timePart = text
    .slice(monthDayMatch.index + monthDayMatch[0].length)
    .replace(/^[,\s]+/, '');
  const rawTimes = timePart.split('&').map((s) => s.trim()).filter(Boolean);
  if (!rawTimes.length) return [];

  const lastPeriodMatch = /am|pm/i.exec(rawTimes[rawTimes.length - 1]);
  if (!lastPeriodMatch) return [];
  const defaultPeriod = lastPeriodMatch[0].toUpperCase();

  const out = [];
  for (const raw of rawTimes) {
    const m = /(\d{1,4})\s*(am|pm)?/i.exec(raw);
    if (!m) continue;
    const { hour: hour12, minute } = parseClockNumber(m[1]);
    const period = (m[2] || defaultPeriod).toUpperCase();
    let hour = hour12 % 12;
    if (period === 'PM') hour += 12;
    out.push({ month, day, hour, minute });
  }
  return out;
}

function isoInManila(year, month, day, hour, minute) {
  const utcMs = Date.UTC(year, month, day, hour, minute, 0) - MANILA_UTC_OFFSET_HOURS * 3600_000;
  return new Date(utcMs).toISOString();
}

/** No year in the source text — assume the nearest future occurrence. */
function resolveYear(month, day, hour, minute, now) {
  const currentYear = new Date(now).getUTCFullYear();
  let iso = isoInManila(currentYear, month, day, hour, minute);
  if (new Date(iso).getTime() < now - 3600_000) {
    iso = isoInManila(currentYear + 1, month, day, hour, minute);
  }
  return iso;
}

/** e.g. '[JUL 25, 2&7PM] "SPIT U: FOODTRIP (Mikit Tana!)" - Angeles Pampanga' */
function parseLinktreeShow(rawTitle) {
  const bracketMatch = BRACKET_RE.exec(rawTitle);
  const quoteMatch = QUOTE_RE.exec(rawTitle);
  if (!bracketMatch || !quoteMatch) return null;

  const showTitle = quoteMatch[1].trim();
  const venue = rawTitle
    .slice(quoteMatch.index + quoteMatch[0].length)
    .replace(/^[\s-]+/, '')
    .trim();
  if (!showTitle || !venue) return null;

  const showtimes = parseDateTimes(bracketMatch[1].trim());
  if (!showtimes.length) return null;

  return { showTitle, venue, showtimes };
}

async function geocodeQuery(query) {
  await sleep(1100); // be a good Nominatim citizen: max ~1 req/sec
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA } });
  if (!res.ok) return null;
  const results = await res.json();
  const hit = results[0];
  if (!hit) return null;
  const addr = hit.address || {};
  const city = addr.city || addr.town || addr.municipality || addr.suburb || addr.city_district || null;
  return { lat: Number(hit.lat), lng: Number(hit.lon), address: hit.display_name, city };
}

// Same progressive fallback as import-comedymanila.mjs: these venue
// fragments are often "specific spot, inside a bigger place" and Nominatim's
// free index frequently only knows the bigger place.
async function geocode(locationText) {
  const parts = locationText.split(',').map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const candidate = `${parts.slice(i).join(', ')}, Philippines`;
    const hit = await geocodeQuery(candidate);
    if (hit) return hit;
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Stripped to bare alphanumerics (not space-normalized) so trivial formatting
// differences between sources — "BLOODBATH 3" vs "BLOODBATH3" — still match.
function normalizeTitle(title) {
  return (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function normalizeVenue(venue) {
  return (venue || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
// One-directional substring containment catches "The Turf PH" vs "The Turf
// PH (Art District)" — same venue, one source just adds a qualifier.
function venuesMatch(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}
function isDuplicate(title, venue, dateStr, existingList) {
  const t = normalizeTitle(title);
  const v = normalizeVenue(venue);
  return existingList.some((e) => e.t === t && e.d === dateStr && venuesMatch(v, e.v));
}
function dateOnly(iso) {
  return (iso || '').slice(0, 10);
}

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing/geocoding only, no writes' : 'live run — will upsert to Supabase');

  const res = await fetch(LINKTREE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SpotMo-EventImporter/1.0; +https://gianrufin.github.io/SpotMo/)',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch Linktree page: HTTP ${res.status}`);
  const html = await res.text();

  const dataMatch = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!dataMatch) throw new Error('Could not find __NEXT_DATA__ on the Linktree page — page structure may have changed.');
  const nextData = JSON.parse(dataMatch[1]);
  const links = nextData?.props?.pageProps?.links ?? [];
  console.log(`Found ${links.length} link entries on the page.`);

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  let supabase = null;
  const existingEvents = [];
  if (!dryRun) {
    if (!supabaseUrl) throw new Error('SUPABASE_URL is required for a live run.');
    supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    // Dedup against *every* existing event, any source — not just our own
    // past runs (external_uid already makes those idempotent via upsert).
    const { data: existing, error } = await supabase.from('events').select('source,title,venue,starts_at');
    if (error) throw error;
    for (const row of existing ?? []) {
      if (row.source === SOURCE_TAG) continue; // our own rows re-upsert fine
      existingEvents.push({ t: normalizeTitle(row.title), v: normalizeVenue(row.venue), d: dateOnly(row.starts_at) });
    }
    console.log(`Loaded ${existingEvents.length} existing event(s) from other sources for dedup.`);
  }

  const now = Date.now();
  const rows = [];
  let skippedDuplicate = 0;
  for (const link of links) {
    if (link.type !== 'CLASSIC' || !link.title) continue;
    const parsed = parseLinktreeShow(link.title);
    if (!parsed) continue; // not a show entry (merch, podcast, socials, etc.)

    const geo = await geocode(parsed.venue);
    if (!geo) {
      console.warn(`Skipping "${parsed.showTitle}" — could not geocode venue "${parsed.venue}".`);
      continue;
    }

    parsed.showtimes.forEach((t, i) => {
      const startsAt = resolveYear(t.month, t.day, t.hour, t.minute, now);
      if (new Date(startsAt).getTime() < now - 3600_000) return; // already past

      const title = parsed.showtimes.length > 1 ? `${parsed.showTitle} (${formatHM(t.hour, t.minute)} show)` : parsed.showTitle;
      if (isDuplicate(title, parsed.venue, dateOnly(startsAt), existingEvents)) {
        console.warn(`Skipping "${title}" on ${dateOnly(startsAt)} — matches an existing event from another source.`);
        skippedDuplicate++;
        return;
      }

      rows.push({
        external_uid: `linktree-spitmanila-${link.id}-${i}`,
        source: SOURCE_TAG,
        title,
        category: CATEGORY,
        poster_url: FALLBACK_POSTER,
        lat: geo.lat,
        lng: geo.lng,
        venue: parsed.venue,
        address: geo.address,
        city: geo.city,
        starts_at: startsAt,
        ends_at: null,
        price_label: null,
        is_free: false,
        description: 'A SPIT Manila improv comedy show.',
        lineup: [],
        ticket_url: link.url || null,
        organizer: ORGANIZER_NAME,
        organizer_id: null,
        status: STATUS,
      });
    });
  }

  console.log(`Skipped: ${skippedDuplicate} duplicate of an existing event.`);
  console.log(`${rows.length} upcoming, geocoded show(s) ready to import:`);
  for (const r of rows) {
    console.log(`  • ${r.title} — ${r.starts_at} @ ${r.venue} (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) [${r.city ?? 'city unknown'}]`);
  }

  if (dryRun) {
    console.log('\nDry run complete — nothing was written. Set SUPABASE_SERVICE_ROLE_KEY to actually upsert.');
    return;
  }

  if (rows.length === 0) {
    console.log('Nothing to upsert.');
    return;
  }

  const { error, count } = await supabase
    .from('events')
    .upsert(rows, { onConflict: 'external_uid', count: 'exact' });
  if (error) throw error;
  console.log(`Upserted ${count ?? rows.length} event(s).`);
}

function formatHM(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute ? `${h12}:${String(minute).padStart(2, '0')}${period}` : `${h12}${period}`;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
