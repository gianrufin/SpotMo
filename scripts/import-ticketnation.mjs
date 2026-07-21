#!/usr/bin/env node
/**
 * Auto-publish importer: Ticketnation (ticketnation.ph) → SpotMo events.
 *
 * The cleanest of the national-platform importers: `robots.txt` explicitly
 * allows GPTBot and OAI-SearchBot and publishes `llms.txt`/`llms-full.txt`,
 * and there's a single public JSON-LD feed with every currently-listed
 * event nationwide — no sitemap crawling, no per-event page fetches, no
 * pagination (confirmed: `?page=2` returns the same total, it's not real).
 *
 *   https://api.ticketnation.ph/public/seo/events-feed
 *
 * The feed gives a full postal address per venue but *not* lat/lng (the
 * matching /public/venues lookup returns 0,0 for venues that haven't been
 * geocoded on their end) — so, like SPIT Manila, this geocodes each venue
 * with Nominatim, deduped by venue name so a repeat venue only costs one
 * lookup per run.
 *
 * Multi-category, nationwide platform + brand-new integration → stays
 * PENDING for admin review, same bar as the other three national-platform
 * importers.
 *
 * Runs on a schedule via .github/workflows/import-ticketnation.yml, using
 * the Supabase *service role* key (bypasses RLS; never expose this
 * client-side). Without SUPABASE_SERVICE_ROLE_KEY set, this runs in
 * dry-run mode: it parses and geocodes but only logs — never writes — so
 * it's safe to run locally.
 */

const FEED_URL = 'https://api.ticketnation.ph/public/seo/events-feed';
const SOURCE_TAG = 'import:ticketnation';
const ORGANIZER_NAME = 'Ticketnation';
const STATUS = 'pending';
const UA = 'Mozilla/5.0 (compatible; SpotMo-EventImporter/1.0; +https://gianrufin.github.io/SpotMo/)';
const NOMINATIM_UA = 'SpotMo-EventImporter/1.0 (https://gianrufin.github.io/SpotMo/)';

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

async function geocodeVenue(venueName, addressParts, cache) {
  const cacheKey = venueName;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const candidates = [
    `${venueName}, ${addressParts.filter(Boolean).join(', ')}`,
    addressParts.filter(Boolean).join(', '),
  ];
  let hit = null;
  for (const candidate of candidates) {
    if (!candidate.trim()) continue;
    hit = await geocodeQuery(candidate);
    if (hit) break;
  }
  cache.set(cacheKey, hit);
  return hit;
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dateOnly(iso) {
  return iso.slice(0, 10);
}

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing/geocoding only, no writes' : 'live run — will upsert to Supabase');

  const feedJson = JSON.parse(await fetchText(FEED_URL));
  const items = (feedJson.itemListElement ?? []).map((li) => li.item).filter(Boolean);
  console.log(`Feed has ${items.length} event(s) currently listed nationwide.`);

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  let supabase = null;
  const existingKeys = new Set();
  if (!dryRun) {
    if (!supabaseUrl) throw new Error('SUPABASE_URL is required for a live run.');
    supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: existing, error } = await supabase.from('events').select('external_uid,title,starts_at');
    if (error) throw error;
    for (const row of existing ?? []) {
      if (row.external_uid?.startsWith(`${SOURCE_TAG}-`)) continue;
      existingKeys.add(`${normalizeTitle(row.title)}|${dateOnly(row.starts_at)}`);
    }
    console.log(`Loaded ${existingKeys.size} existing event key(s) from other sources for dedup.`);
  }

  const now = Date.now();
  const geoCache = new Map();
  const rows = [];
  let skippedMalformed = 0;
  let skippedCancelled = 0;
  let skippedPast = 0;
  let skippedNoGeo = 0;
  let skippedDuplicate = 0;

  for (const ev of items) {
    const venue = ev.location?.name;
    const addr = ev.location?.address ?? {};
    if (!ev.name || !ev.startDate || !venue || /^(tba|tbd|to be announced|to be confirmed)$/i.test(venue.trim())) {
      skippedMalformed++;
      continue;
    }
    if (/Cancelled/i.test(ev.eventStatus ?? '')) {
      skippedCancelled++;
      continue;
    }
    const startsAt = new Date(ev.startDate).toISOString();
    if (new Date(startsAt).getTime() < now - 3600_000) {
      skippedPast++;
      continue;
    }

    const dedupKey = `${normalizeTitle(ev.name)}|${dateOnly(startsAt)}`;
    if (existingKeys.has(dedupKey)) {
      console.warn(`Skipping "${ev.name}" on ${dateOnly(startsAt)} — matches an existing event from another source.`);
      skippedDuplicate++;
      continue;
    }

    const geo = await geocodeVenue(venue, [addr.streetAddress, addr.addressLocality, addr.addressRegion, 'Philippines'], geoCache);
    if (!geo) {
      console.warn(`Skipping "${ev.name}" — could not geocode venue "${venue}".`);
      skippedNoGeo++;
      continue;
    }

    const lowPrice = ev.offers?.lowPrice;
    const highPrice = ev.offers?.highPrice;
    const priceLabel = lowPrice != null ? (lowPrice === highPrice ? `₱${lowPrice}` : `₱${lowPrice}–${highPrice}`) : null;

    rows.push({
      external_uid: `${SOURCE_TAG}-${ev.url?.split('/').pop() ?? normalizeTitle(ev.name)}`,
      source: SOURCE_TAG,
      title: ev.name,
      category: 'music',
      poster_url: Array.isArray(ev.image) ? ev.image[0] : ev.image ?? '',
      lat: geo.lat,
      lng: geo.lng,
      venue,
      address: geo.address,
      city: addr.addressLocality ?? geo.city,
      starts_at: startsAt,
      ends_at: ev.endDate ? new Date(ev.endDate).toISOString() : null,
      price_label: priceLabel,
      is_free: lowPrice === 0,
      description: ev.description || `${ev.name}, at ${venue}.`,
      lineup: [],
      ticket_url: ev.url ?? ev.offers?.url ?? null,
      organizer: ev.organizer?.name || ORGANIZER_NAME,
      organizer_id: null,
      status: STATUS,
    });
  }

  console.log(
    `Skipped: ${skippedMalformed} malformed, ${skippedCancelled} cancelled, ${skippedPast} already past, ` +
      `${skippedNoGeo} ungeocodable, ${skippedDuplicate} duplicate of an existing event.`,
  );
  console.log(`${rows.length} upcoming event(s) ready to import:`);
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
  const { error, count } = await supabase.from('events').upsert(rows, { onConflict: 'external_uid', count: 'exact' });
  if (error) throw error;
  console.log(`Upserted ${count ?? rows.length} event(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
