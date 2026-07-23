#!/usr/bin/env node
/**
 * Auto-publish importer: Clara Benin (clarabenin.com/tickets) → SpotMo events.
 *
 * A third technique again: this site runs on Wix Events, which server-renders
 * full structured event data directly into the page as JSON — no calendar
 * feed, no freeform text to parse. The page embeds a
 * <script id="wix-warmup-data"> blob containing, per event: exact lat/lng
 * (Wix's own geocoding, so no Nominatim lookups needed at all here), ISO
 * start/end times, a real poster image, ticket pricing, and a slug to build
 * the ticket URL from. This is the most structured/reliable of the three
 * importers, so — like Comedy Manila's ICS feed, and unlike SPIT Manila's
 * regex-parsed Linktree text — it auto-publishes straight to 'approved'.
 *
 * Runs on a schedule via .github/workflows/import-clarabenin.yml, using the
 * Supabase *service role* key (bypasses RLS; never expose this client-side).
 * Without SUPABASE_SERVICE_ROLE_KEY set, this runs in dry-run mode: it parses
 * but only logs — never writes — so it's safe to run locally.
 */

const PAGE_URL = 'https://www.clarabenin.com/tickets';
const SOURCE_TAG = 'import:wix-clarabenin';
const ORGANIZER_NAME = 'Clara Benin';
const CATEGORY = 'music';
// The standard Wix Events app id — stable across Wix sites that use it.
const WIX_EVENTS_APP_ID = '140603ad-af8d-84a5-2c80-a0f60cb47351';

const dryRun = !process.env.SUPABASE_SERVICE_ROLE_KEY;

function findEventsArray(appWarmupData) {
  // The widget instance key (e.g. "widgetcomp-xxxxx") varies per page/site —
  // search for whichever one actually holds an events array instead of
  // hardcoding it, so a Wix editor change doesn't silently break this.
  for (const widget of Object.values(appWarmupData ?? {})) {
    const events = widget?.events?.events;
    if (Array.isArray(events)) return events;
  }
  return [];
}

function formatPriceLabel(ticketing) {
  if (!ticketing) return null;
  const lo = ticketing.lowestTicketPriceFormatted;
  const hi = ticketing.highestTicketPriceFormatted;
  if (!lo) return null;
  return lo === hi ? lo : `${lo}–${hi}`;
}

function isFreeEvent(ticketing) {
  if (!ticketing) return true;
  const value = Number(ticketing.lowestTicketPrice?.value ?? 0);
  return !value;
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

// Wix's CDN appears to rate-limit/soft-block datacenter IPs (observed: the
// connection gets cut mid-response after ~40KB of an ~860KB page, rather
// than an outright refusal) — GitHub Actions runner IPs are a well-known
// range for this kind of throttling. A full browser-like header set plus a
// short retry loop is enough to get through in practice.
async function fetchPage(url, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.length < 100_000) throw new Error(`Suspiciously short response (${html.length} bytes) — likely truncated by a CDN block`);
      return html;
    } catch (err) {
      lastErr = err;
      console.warn(`Fetch attempt ${i + 1}/${attempts} failed: ${err.message}`);
      if (i < attempts - 1) await sleep(2000 * (i + 1));
    }
  }
  throw lastErr;
}

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing only, no writes' : 'live run — will upsert to Supabase');

  const html = await fetchPage(PAGE_URL);
  console.log(`Fetched page: ${html.length} bytes`);

  const dataMatch = /<script type="application\/json" id="wix-warmup-data">([\s\S]*?)<\/script>/.exec(html);
  if (!dataMatch) throw new Error('Could not find wix-warmup-data on the page — page structure may have changed.');
  const warmupData = JSON.parse(dataMatch[1]);
  const appData = warmupData?.appsWarmupData?.[WIX_EVENTS_APP_ID];
  const rawEvents = findEventsArray(appData);
  console.log(`Found ${rawEvents.length} event(s) in the page's embedded data.`);

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
  for (const ev of rawEvents) {
    const startsAt = ev.scheduling?.config?.startDate;
    const lat = ev.location?.coordinates?.lat;
    const lng = ev.location?.coordinates?.lng;
    if (!ev.id || !ev.title || !startsAt || lat == null || lng == null) {
      console.warn('Skipping malformed entry (missing id/title/start/coords):', ev.title ?? '(untitled)');
      continue;
    }
    if (new Date(startsAt).getTime() < now - 3600_000) continue; // already past

    const venue = ev.location?.name ?? ev.title;
    if (isDuplicate(ev.title, venue, dateOnly(startsAt), existingEvents)) {
      console.warn(`Skipping "${ev.title}" on ${dateOnly(startsAt)} — matches an existing event from another source.`);
      skippedDuplicate++;
      continue;
    }

    const ticketing = ev.registration?.ticketing;
    rows.push({
      external_uid: `wix-clarabenin-${ev.id}`,
      source: SOURCE_TAG,
      title: ev.title,
      category: CATEGORY,
      poster_url: ev.mainImage?.url ?? null,
      lat,
      lng,
      venue,
      address: ev.location?.fullAddress?.formattedAddress ?? ev.location?.address ?? null,
      city: ev.location?.fullAddress?.city ?? null,
      starts_at: startsAt,
      ends_at: ev.scheduling?.config?.endDate ?? null,
      price_label: formatPriceLabel(ticketing),
      is_free: isFreeEvent(ticketing),
      description: ev.description || 'A Clara Benin live show.',
      lineup: [],
      ticket_url: ev.slug ? `https://www.clarabenin.com/event-details/${ev.slug}` : null,
      organizer: ORGANIZER_NAME,
      organizer_id: null,
      status: 'approved',
    });
  }

  console.log(`Skipped: ${skippedDuplicate} duplicate of an existing event.`);
  console.log(`${rows.length} upcoming event(s) ready to import:`);
  for (const r of rows) {
    console.log(`  • ${r.title} — ${r.starts_at} @ ${r.venue} (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) [${r.city ?? 'city unknown'}] ${r.price_label ?? 'free'}`);
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
