#!/usr/bin/env node
/**
 * Auto-publish importer: Ticketmelon (ticketmelon.com) → SpotMo events.
 *
 * A Southeast Asia-wide ticketing platform (Thailand, Vietnam, Malaysia, the
 * Philippines all mixed together under the same domain) — filtered down to
 * PH-only via each event's own `timezone.country === "Asia/Manila"` field,
 * which is far more reliable than trying to parse country out of a freeform
 * venue address string.
 *
 * Discovery: `sitemap.xml` is a sitemap index pointing at 5 sub-sitemaps
 * (`sitemap-event1.xml` .. `sitemap-event5.xml`), together listing every
 * currently-published event across the whole platform (~500-something
 * events, all countries) — small enough to fetch in full rather than
 * needing a recency window like TicketMAX's much larger sitemap.
 *
 * Each event page is a Next.js SSR page with a `__NEXT_DATA__` blob
 * containing the full event object — name, start/end time (epoch ms),
 * `categories` (freeform tags, e.g. "Nightlife"), and venue name/address
 * *with real lat/lng* (no geocoding needed).
 *
 * Multi-category, multi-country platform + brand-new integration → stays
 * PENDING for admin review, same bar as TicketNet and TicketMAX.
 *
 * Runs on a schedule via .github/workflows/import-ticketmelon.yml, using the
 * Supabase *service role* key (bypasses RLS; never expose this client-side).
 * Without SUPABASE_SERVICE_ROLE_KEY set, this runs in dry-run mode: it parses
 * but only logs — never writes — so it's safe to run locally.
 */

const SITE_ORIGIN = 'https://www.ticketmelon.com';
const SITEMAP_INDEX = `${SITE_ORIGIN}/sitemap.xml`;
const SOURCE_TAG = 'import:ticketmelon';
const ORGANIZER_NAME = 'Ticketmelon';
const STATUS = 'pending';
const UA = 'Mozilla/5.0 (compatible; SpotMo-EventImporter/1.0; +https://gianrufin.github.io/SpotMo/)';
const PH_TIMEZONE = 'Asia/Manila';

const dryRun = !process.env.SUPABASE_SERVICE_ROLE_KEY;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, attempts = 3) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const { stdout } = await run('curl', ['-sSL', '--fail', '-A', UA, url], { maxBuffer: 20 * 1024 * 1024 });
      return stdout;
    } catch (err) {
      lastErr = err;
      console.warn(`Fetch attempt ${i + 1}/${attempts} for ${url} failed: ${err.message.split('\n')[0]}`);
      if (i < attempts - 1) await sleep(1500 * (i + 1));
    }
  }
  throw lastErr;
}

const CATEGORY_MAP = {
  music: 'music', concert: 'music', concerts: 'music', gig: 'music', gigs: 'music',
  comedy: 'comedy', 'stand-up': 'comedy',
  art: 'art', exhibit: 'art', exhibition: 'art', theater: 'art', theatre: 'art',
  market: 'market', bazaar: 'market', fair: 'market',
  food: 'food', 'food & drink': 'food', culinary: 'food',
  nightlife: 'music', festival: 'music', party: 'music',
};

function classify(categories) {
  for (const c of categories ?? []) {
    const mapped = CATEGORY_MAP[String(c).toLowerCase()];
    if (mapped) return mapped;
  }
  return 'community';
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
  return iso.slice(0, 10);
}

function extractEvent(html) {
  const m = /id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(html);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    return data?.props?.pageProps?.event ?? null;
  } catch {
    return null;
  }
}

// Ticketmelon doesn't expose ticket-tier pricing in any page we can fetch
// without running their client-side app (it's loaded via a separate XHR after
// page load) — but organizers often write the price directly into the
// description ("Tickets: ₱1,750 Early Bird / ₱2,000 Regular"). Best-effort
// only: if we can't find a peso amount, leave price unset rather than guess.
function extractPriceFromDescription(description) {
  const amounts = [...(description || '').matchAll(/₱\s?([\d,]+(?:\.\d+)?)/g)]
    .map((m) => Number(m[1].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n));
  if (amounts.length === 0) return { priceLabel: null, isFree: false };
  const lo = Math.min(...amounts);
  const hi = Math.max(...amounts);
  const priceLabel = lo === hi ? `₱${lo.toLocaleString('en-PH')}` : `₱${lo.toLocaleString('en-PH')}–₱${hi.toLocaleString('en-PH')}`;
  return { priceLabel, isFree: false };
}

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing only, no writes' : 'live run — will upsert to Supabase');

  const indexXml = await fetchText(SITEMAP_INDEX);
  const subSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`Found ${subSitemaps.length} sub-sitemap(s).`);

  const eventUrls = [];
  for (const sm of subSitemaps) {
    const xml = await fetchText(sm);
    eventUrls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  console.log(`${eventUrls.length} event URL(s) total across the platform (all countries).`);

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  let supabase = null;
  const existingEvents = [];
  if (!dryRun) {
    if (!supabaseUrl) throw new Error('SUPABASE_URL is required for a live run.');
    supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: existing, error } = await supabase.from('events').select('source,title,venue,starts_at');
    if (error) throw error;
    for (const row of existing ?? []) {
      if (row.source === SOURCE_TAG) continue;
      existingEvents.push({ t: normalizeTitle(row.title), v: normalizeVenue(row.venue), d: dateOnly(row.starts_at) });
    }
    console.log(`Loaded ${existingEvents.length} existing event(s) from other sources for dedup.`);
  }

  const now = Date.now();
  const rows = [];
  let skippedFetch = 0;
  let skippedNotPH = 0;
  let skippedPast = 0;
  let skippedInactive = 0;
  let skippedDuplicate = 0;

  for (const url of eventUrls) {
    let html;
    try {
      html = await fetchText(url);
    } catch (err) {
      console.warn(`Skipping ${url} — fetch failed: ${err.message.split('\n')[0]}`);
      skippedFetch++;
      continue;
    }
    const ev = extractEvent(html);
    if (!ev || !ev.name || !ev.show_starttime || !ev.venue) {
      skippedFetch++;
      continue;
    }
    if (ev.timezone?.country !== PH_TIMEZONE) {
      skippedNotPH++;
      continue;
    }
    if (ev.status && ev.status !== 'publish') {
      skippedInactive++;
      continue;
    }
    const startsAt = new Date(ev.show_starttime).toISOString();
    if (new Date(startsAt).getTime() < now - 3600_000) {
      skippedPast++;
      continue;
    }

    const venue = ev.venue.name ?? ev.name;
    if (isDuplicate(ev.name, venue, dateOnly(startsAt), existingEvents)) {
      console.warn(`Skipping "${ev.name}" on ${dateOnly(startsAt)} — matches an existing event from another source.`);
      skippedDuplicate++;
      continue;
    }

    const cleanDescription = (ev.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const { priceLabel, isFree } = extractPriceFromDescription(cleanDescription);
    rows.push({
      external_uid: `${SOURCE_TAG}-${ev.slug}`,
      source: SOURCE_TAG,
      title: ev.name,
      category: classify(ev.categories),
      poster_url: ev.img_banner || ev.img_poster || '',
      lat: Number(ev.venue.latitude),
      lng: Number(ev.venue.longitude),
      venue,
      address: ev.venue.address ?? null,
      city: null,
      starts_at: startsAt,
      ends_at: ev.show_endtime ? new Date(ev.show_endtime).toISOString() : null,
      price_label: priceLabel,
      is_free: isFree,
      description: cleanDescription || `${ev.name}, at ${ev.venue.name ?? 'TBA'}.`,
      lineup: [],
      ticket_url: url,
      organizer: ev.eo_profile?.name || ORGANIZER_NAME,
      organizer_id: null,
      status: STATUS,
    });
  }

  console.log(
    `Skipped: ${skippedFetch} unparseable/fetch-failed, ${skippedNotPH} not Philippines, ${skippedInactive} not published, ` +
      `${skippedPast} already past, ${skippedDuplicate} duplicate of an existing event.`,
  );
  console.log(`${rows.length} upcoming PH event(s) ready to import:`);
  for (const r of rows) {
    console.log(`  • ${r.title} — ${r.starts_at} @ ${r.venue} (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) [${r.category}]`);
  }

  if (dryRun) {
    console.log('\nDry run complete — nothing was written. Set SUPABASE_SERVICE_ROLE_KEY to actually upsert.');
    return;
  }
  if (rows.length === 0) {
    console.log('Nothing to upsert.');
    return;
  }
  const { error, count } = await supabase.from('events').upsert(rows, { onConflict: 'external_uid', count: 'exact' });
  if (error) throw error;
  console.log(`Upserted ${count ?? rows.length} event(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
