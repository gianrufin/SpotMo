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

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing only, no writes' : 'live run — will upsert to Supabase');

  const res = await fetch(PAGE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SpotMo-EventImporter/1.0; +https://gianrufin.github.io/SpotMo/)',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch page: HTTP ${res.status}`);
  const html = await res.text();

  const dataMatch = /<script type="application\/json" id="wix-warmup-data">([\s\S]*?)<\/script>/.exec(html);
  if (!dataMatch) throw new Error('Could not find wix-warmup-data on the page — page structure may have changed.');
  const warmupData = JSON.parse(dataMatch[1]);
  const appData = warmupData?.appsWarmupData?.[WIX_EVENTS_APP_ID];
  const rawEvents = findEventsArray(appData);
  console.log(`Found ${rawEvents.length} event(s) in the page's embedded data.`);

  const now = Date.now();
  const rows = [];
  for (const ev of rawEvents) {
    const startsAt = ev.scheduling?.config?.startDate;
    const lat = ev.location?.coordinates?.lat;
    const lng = ev.location?.coordinates?.lng;
    if (!ev.id || !ev.title || !startsAt || lat == null || lng == null) {
      console.warn('Skipping malformed entry (missing id/title/start/coords):', ev.title ?? '(untitled)');
      continue;
    }
    if (new Date(startsAt).getTime() < now - 3600_000) continue; // already past

    const ticketing = ev.registration?.ticketing;
    rows.push({
      external_uid: `wix-clarabenin-${ev.id}`,
      source: SOURCE_TAG,
      title: ev.title,
      category: CATEGORY,
      poster_url: ev.mainImage?.url ?? null,
      lat,
      lng,
      venue: ev.location?.name ?? ev.title,
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

  console.log(`${rows.length} upcoming event(s) ready to import:`);
  for (const r of rows) {
    console.log(`  • ${r.title} — ${r.starts_at} @ ${r.venue} (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) [${r.city ?? 'city unknown'}] ${r.price_label ?? 'free'}`);
  }

  if (dryRun) {
    console.log('\nDry run complete — nothing was written. Set SUPABASE_SERVICE_ROLE_KEY to actually upsert.');
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error('SUPABASE_URL is required for a live run.');
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

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
