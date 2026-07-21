#!/usr/bin/env node
/**
 * Auto-publish importer: TicketNet (ticketnet.com.ph/event-list) → SpotMo events.
 *
 * A fourth technique: TicketNet server-renders a plain HTML grid of event
 * cards (no JSON blob, no calendar feed, no Cloudflare/robots blocking) —
 * title, a loosely-formatted date/time string, venue name, and a poster
 * image are all directly in the markup, filtered client-side by
 * Isotope.js. We regex-parse the date/time text (similar uncertainty to
 * SPIT Manila's freeform Linktree parsing) and geocode the venue with
 * Nominatim, caching one lookup per distinct venue since there are only a
 * handful across the whole page.
 *
 * TicketNet's listing mixes real one-off events (concerts, a film
 * festival) with routine multiplex movie showtimes and season-long
 * placeholders (a whole basketball conference, "movie line-up") that
 * don't fit SpotMo's "single happening, one pin, one time" model. Those
 * are filtered out — see classify() and the date-parse skip below —
 * rather than imported as low-quality pins.
 *
 * Because this relies on our own regex date parsing and venue geocoding
 * (not a structured feed), this stays PENDING for admin review, same as
 * SPIT Manila. Before writing, every candidate is checked against
 * *all* existing events (any source) by normalized title + calendar day,
 * so a TicketNet listing that duplicates something already on the map
 * (from another importer or manual entry) is skipped rather than
 * double-posted.
 *
 * Runs on a schedule via .github/workflows/import-ticketnet.yml, using the
 * Supabase *service role* key (bypasses RLS; never expose this client-side).
 * Without SUPABASE_SERVICE_ROLE_KEY set, this runs in dry-run mode: it parses
 * and geocodes but only logs — never writes — so it's safe to run locally.
 */

const PAGE_URL = 'https://www.ticketnet.com.ph/event-list';
const SITE_ORIGIN = 'https://www.ticketnet.com.ph';
const SOURCE_TAG = 'import:ticketnet';
const ORGANIZER_NAME = 'TicketNet';
const STATUS = 'pending'; // regex date parsing + geocoding is less certain than a structured feed
const MANILA_UTC_OFFSET_HOURS = 8;
const NOMINATIM_UA = 'SpotMo-EventImporter/1.0 (https://gianrufin.github.io/SpotMo/)';
const UA = 'Mozilla/5.0 (compatible; SpotMo-EventImporter/1.0; +https://gianrufin.github.io/SpotMo/)';

const dryRun = !process.env.SUPABASE_SERVICE_ROLE_KEY;

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** "July 25 & 26, 2026" / "AUGUST 21,2026" -> [{month, year, days: [25,26]}] */
function parseDatePart(text) {
  const m = /([A-Za-z]+)\s+(\d{1,2})(?:\s*&\s*(\d{1,2}))?\s*,\s*(\d{4})/.exec(text);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  const days = [Number(m[2])];
  if (m[3]) days.push(Number(m[3]));
  return { month, year: Number(m[4]), days };
}

/** "8:00 PM" / "3PM" / "12:30 PM - 9:00 PM" (takes the first time) -> {hour, minute} */
function parseTimePart(text) {
  const m = /(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])/.exec(text);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') hour += 12;
  return { hour, minute: m[2] ? Number(m[2]) : 0 };
}

function isoInManila(year, month, day, hour, minute) {
  const utcMs = Date.UTC(year, month, day, hour, minute, 0) - MANILA_UTC_OFFSET_HOURS * 3600_000;
  return new Date(utcMs).toISOString();
}

/**
 * Decide category, or null to skip entirely (routine multiplex movie
 * showtimes and other non-"event" cinema listings aren't a fit for a
 * local-happenings map).
 */
function classify(cssClass, venue, title) {
  const isCinema = /gateway cineplex/i.test(venue);
  if (cssClass.includes('show-and-concerts')) return 'music';
  if (cssClass.includes('sports')) return 'community';
  if (isCinema) return /cinemalaya/i.test(title) ? 'art' : null;
  return 'music'; // blank class at a concert venue (e.g. a K-pop show) — still a concert
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dateOnly(iso) {
  return iso.slice(0, 10);
}

// Plain fetch() gets a 403 from this site's WAF (a client-fingerprint
// heuristic, not a stated bot policy — its robots.txt has no Disallow and
// its terms don't mention scraping) while curl passes cleanly from most
// networks. GitHub Actions' runner IP ranges get an outright 403 even via
// curl though (a common WAF heuristic against well-known datacenter/CI IP
// blocks, same family of issue as the Wix CDN throttling worked around in
// import-clarabenin.mjs) — a fuller browser-like header set plus a short
// retry loop is enough in practice.
async function fetchHtml(url, attempts = 4) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const args = [
    '-sSL',
    '--fail',
    '-H', `User-Agent: ${UA}`,
    '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    '-H', 'Accept-Language: en-US,en;q=0.9',
    '-H', 'Sec-Fetch-Mode: navigate',
    url,
  ];
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const { stdout } = await run('curl', args, { maxBuffer: 20 * 1024 * 1024 });
      return stdout;
    } catch (err) {
      lastErr = err;
      console.warn(`Fetch attempt ${i + 1}/${attempts} for ${url} failed: ${err.message.split('\n')[0]}`);
      if (i < attempts - 1) await sleep(2500 * (i + 1));
    }
  }
  throw lastErr;
}

function parseListingCards(html) {
  const cards = html.split(/(?=<div class="col-xl-3[^"]*grid-item)/).slice(1);
  const out = [];
  for (const card of cards) {
    const cssMatch = /grid-item\s+([a-z0-9 -]*)"/.exec(card);
    const linkMatch = /class="title">\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)</.exec(card);
    const durations = [...card.matchAll(/<span class="duration">.*?<\/i>\s*([^<]+)</gs)].map((m) => m[1].trim());
    const venueMatch = /class="quality">([^<]+)</.exec(card);
    const posterMatch = /<img src="([^"]+)"/.exec(card);
    if (!linkMatch || !venueMatch || !posterMatch) continue;
    out.push({
      cssClass: cssMatch ? cssMatch[1] : '',
      href: linkMatch[1],
      title: linkMatch[2].trim(),
      dateText: durations[0] ?? '',
      timeText: durations[1] ?? '',
      venue: venueMatch[1].trim(),
      poster: posterMatch[1],
    });
  }
  return out;
}

/** Best-effort richer subtitle from the event's own detail page; falls back
 * to a generic line if the page is unreachable or the markup changed. */
async function fetchSubtitle(href) {
  try {
    const html = await fetchHtml(`${SITE_ORIGIN}${href}`);
    const m = /<div class="movie-details-content">\s*<h5>([^<]+)<\/h5>/.exec(html);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
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

// Nominatim doesn't recognize some venues by their own marquee name — give
// it the mall/landmark name it does know instead.
const VENUE_ALIASES = {
  'GATEWAY CINEPLEX 18': 'Gateway Mall, Cubao, Quezon City',
};

async function geocodeVenue(venue, cache) {
  if (cache.has(venue)) return cache.get(venue);
  const query = VENUE_ALIASES[venue] ?? venue;
  const hit = await geocodeQuery(`${query}, Philippines`);
  cache.set(venue, hit);
  return hit;
}

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing/geocoding only, no writes' : 'live run — will upsert to Supabase');

  const html = await fetchHtml(PAGE_URL);
  console.log(`Fetched page: ${html.length} bytes`);

  const cards = parseListingCards(html);
  console.log(`Found ${cards.length} card(s) on the page.`);

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  let supabase = null;
  const existingKeys = new Set();
  if (!dryRun) {
    if (!supabaseUrl) throw new Error('SUPABASE_URL is required for a live run.');
    supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    // Dedup against *every* existing event, any source — not just our own
    // past runs (external_uid already makes those idempotent via upsert).
    const { data: existing, error } = await supabase.from('events').select('external_uid,title,starts_at');
    if (error) throw error;
    for (const row of existing ?? []) {
      if (row.external_uid?.startsWith(`${SOURCE_TAG}-`)) continue; // our own rows re-upsert fine
      existingKeys.add(`${normalizeTitle(row.title)}|${dateOnly(row.starts_at)}`);
    }
    console.log(`Loaded ${existingKeys.size} existing event key(s) from other sources for dedup.`);
  }

  const now = Date.now();
  const geoCache = new Map();
  const rows = [];
  let skippedNotAnEvent = 0;
  let skippedNoDate = 0;
  let skippedNoGeo = 0;
  let skippedDuplicate = 0;

  for (const card of cards) {
    const category = classify(card.cssClass, card.venue, card.title);
    if (!category) {
      skippedNotAnEvent++;
      continue;
    }

    const datePart = parseDatePart(card.dateText);
    const timePart = parseTimePart(card.timeText);
    if (!datePart || !timePart) {
      skippedNoDate++;
      continue;
    }

    const geo = await geocodeVenue(card.venue, geoCache);
    if (!geo) {
      console.warn(`Skipping "${card.title}" — could not geocode venue "${card.venue}".`);
      skippedNoGeo++;
      continue;
    }

    const subtitle = await fetchSubtitle(card.href);
    const description = subtitle ? `${subtitle}. Live at ${card.venue}.` : `${card.title}, live at ${card.venue}.`;
    const ticketUrl = card.href.startsWith('http') ? card.href : `${SITE_ORIGIN}${card.href}`;

    datePart.days.forEach((day, i) => {
      const startsAt = isoInManila(datePart.year, datePart.month, day, timePart.hour, timePart.minute);
      if (new Date(startsAt).getTime() < now - 3600_000) return; // already past

      const dedupKey = `${normalizeTitle(card.title)}|${dateOnly(startsAt)}`;
      if (existingKeys.has(dedupKey)) {
        console.warn(`Skipping "${card.title}" on ${dateOnly(startsAt)} — matches an existing event from another source.`);
        skippedDuplicate++;
        return;
      }

      rows.push({
        external_uid: `${SOURCE_TAG}-${card.href}-${i}`,
        source: SOURCE_TAG,
        title: datePart.days.length > 1 ? `${card.title} (${['Day 1', 'Day 2', 'Day 3'][i] ?? `Day ${i + 1}`})` : card.title,
        category,
        poster_url: card.poster,
        lat: geo.lat,
        lng: geo.lng,
        venue: card.venue,
        address: geo.address,
        city: geo.city,
        starts_at: startsAt,
        ends_at: null,
        price_label: null,
        is_free: false,
        description,
        lineup: [],
        ticket_url: ticketUrl,
        organizer: ORGANIZER_NAME,
        organizer_id: null,
        status: STATUS,
      });
    });
  }

  console.log(
    `Skipped: ${skippedNotAnEvent} not-an-event (movie/placeholder), ${skippedNoDate} unparseable date, ` +
      `${skippedNoGeo} ungeocodable venue, ${skippedDuplicate} duplicate of an existing event.`,
  );
  console.log(`${rows.length} upcoming event(s) ready to import:`);
  for (const r of rows) {
    console.log(`  • ${r.title} — ${r.starts_at} @ ${r.venue} (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) [${r.city ?? 'city unknown'}] [${r.category}]`);
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

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
