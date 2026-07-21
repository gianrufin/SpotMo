#!/usr/bin/env node
/**
 * Auto-publish importer: AllEvents.in → SpotMo events.
 *
 * A global events directory with per-city listing pages — used here as the
 * main way to reach specific Visayas/Mindanao/South Luzon cities that the
 * national ticketing platforms (TicketMAX/Ticketmelon/Ticketnation) barely
 * cover yet. `robots.txt` explicitly names ClaudeBot with just a
 * crawl-delay (no disallow), and every individual event page embeds full
 * schema.org Event JSON-LD with real venue lat/lng — no geocoding needed.
 *
 * Discovery: each city has its own listing path (confirmed working: /cebu-ph,
 * /davao, /general-santos, /iloilo, /bacolod, /cagayan-de-oro-city,
 * /zamboanga, /batangas — the slugs aren't a single consistent formula per
 * city, hence the explicit list below) whose `/all` page lists plain HTML
 * cards (`data-link` → the event's own detail page). We collect the unique
 * detail-page URLs across all cities, then fetch each once for its JSON-LD.
 *
 * AllEvents.in is itself an aggregator (pulls from organizer submissions,
 * social platforms, etc.), so cross-source duplicates are expected and the
 * usual normalized-title+date dedup applies same as every other importer.
 *
 * Multi-city, multi-category aggregator + brand-new integration → stays
 * PENDING for admin review, same bar as the other national-platform
 * importers.
 *
 * Runs on a schedule via .github/workflows/import-allevents.yml, using the
 * Supabase *service role* key (bypasses RLS; never expose this client-side).
 * Without SUPABASE_SERVICE_ROLE_KEY set, this runs in dry-run mode: it parses
 * but only logs — never writes — so it's safe to run locally.
 */

const SITE_ORIGIN = 'https://allevents.in';
// Confirmed-working city slugs outside Metro Manila, spanning Central/Western
// Visayas, Southern/Northern Mindanao, and South Luzon.
const CITY_SLUGS = ['cebu-ph', 'iloilo', 'bacolod', 'davao', 'general-santos', 'cagayan-de-oro-city', 'zamboanga', 'batangas'];
const SOURCE_TAG = 'import:allevents';
const ORGANIZER_NAME = 'AllEvents.in';
const STATUS = 'pending';
const UA = 'Mozilla/5.0 (compatible; SpotMo-EventImporter/1.0; +https://gianrufin.github.io/SpotMo/)';

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

function classify(schemaType) {
  const t = (schemaType ?? '').toLowerCase();
  if (t.includes('music')) return 'music';
  if (t.includes('comedy')) return 'comedy';
  if (t.includes('theater') || t.includes('theatre') || t.includes('exhibition') || t.includes('art')) return 'art';
  if (t.includes('food')) return 'food';
  if (t.includes('sale') || t.includes('market')) return 'market';
  return 'community';
}

// Loose bounding box around the Philippines — this aggregator's per-city
// pages occasionally leak unrelated listings from other countries (observed:
// India events surfacing under a Mindanao city query).
function isInPhilippines(lat, lng) {
  return lat >= 4.5 && lat <= 21.5 && lng >= 116 && lng <= 127.5;
}

// AllEvents.in is an open self-serve platform — alongside real listings,
// city pages carry personal social-media-style posts ("thank you for
// following", "pm me") that aren't events at all. schema.org @type doesn't
// reliably separate these (both junk and legitimate low-key listings often
// share a bare "Event" type), so filter on title shape instead: reject
// first/second-person conversational phrases and stray vlog-channel names.
const JUNK_TITLE_RE =
  /\b(thank you|thank u|pm me|please (subscribe|follow)|follow(ing)? me|good morning|god bless|vlog|subscribe)\b/i;

function looksLikeJunkTitle(title) {
  if (JUNK_TITLE_RE.test(title)) return true;
  const words = title.trim().split(/\s+/);
  if (words.length <= 3 && title === title.toLowerCase()) return true; // short & no capitalization at all
  return false;
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dateOnly(iso) {
  return iso.slice(0, 10);
}

function extractEventJsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  for (const [, raw] of blocks) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed['@type'] && parsed['@type'] !== 'BreadcrumbList' && parsed['@type'] !== 'FAQPage') return parsed;
    } catch {
      // try the next block
    }
  }
  return null;
}

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing only, no writes' : 'live run — will upsert to Supabase');

  const eventUrls = new Set();
  for (const slug of CITY_SLUGS) {
    const html = await fetchText(`${SITE_ORIGIN}/${slug}/all`);
    const links = [...html.matchAll(/data-link="(https:\/\/allevents\.in\/[^"]+)"/g)].map((m) => m[1]);
    for (const link of links) eventUrls.add(link);
    console.log(`${slug}: ${links.length} card(s) found.`);
  }
  console.log(`${eventUrls.size} unique event URL(s) across ${CITY_SLUGS.length} cities.`);

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
  const rows = [];
  let skippedFetch = 0;
  let skippedCancelled = 0;
  let skippedPast = 0;
  let skippedDuplicate = 0;
  let skippedOutsidePH = 0;
  let skippedJunkTitle = 0;

  for (const url of eventUrls) {
    let html;
    try {
      html = await fetchText(url);
    } catch (err) {
      console.warn(`Skipping ${url} — fetch failed: ${err.message.split('\n')[0]}`);
      skippedFetch++;
      continue;
    }
    const ev = extractEventJsonLd(html);
    if (!ev || !ev.name || !ev.startDate || !ev.location?.geo) {
      skippedFetch++;
      continue;
    }
    if (looksLikeJunkTitle(ev.name)) {
      skippedJunkTitle++;
      continue;
    }
    const evLat = Number(ev.location.geo.latitude);
    const evLng = Number(ev.location.geo.longitude);
    if (!isInPhilippines(evLat, evLng)) {
      skippedOutsidePH++;
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

    const eventId = url.split('/').filter(Boolean).pop();
    const organizerName = Array.isArray(ev.organizer) ? ev.organizer[0]?.name : ev.organizer?.name;
    rows.push({
      external_uid: `${SOURCE_TAG}-${eventId}`,
      source: SOURCE_TAG,
      title: ev.name,
      category: classify(ev['@type']),
      poster_url: Array.isArray(ev.image) ? ev.image[0] : ev.image ?? '',
      lat: evLat,
      lng: evLng,
      venue: ev.location.name ?? ev.name,
      address: ev.location.address ? [ev.location.address.streetAddress, ev.location.address.addressLocality].filter(Boolean).join(', ') : null,
      city: ev.location.address?.addressLocality ?? null,
      starts_at: startsAt,
      ends_at: ev.endDate ? new Date(ev.endDate).toISOString() : null,
      price_label: null,
      is_free: false,
      description: (ev.description || '').trim() || `${ev.name}, at ${ev.location.name ?? 'TBA'}.`,
      lineup: [],
      ticket_url: ev.url ?? url,
      organizer: organizerName || ORGANIZER_NAME,
      organizer_id: null,
      status: STATUS,
    });
  }

  console.log(
    `Skipped: ${skippedFetch} unparseable/fetch-failed, ${skippedJunkTitle} junk-looking titles, ${skippedOutsidePH} outside PH bounds, ` +
      `${skippedCancelled} cancelled, ${skippedPast} already past, ${skippedDuplicate} duplicate of an existing event.`,
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
  const { error, count } = await supabase.from('events').upsert(rows, { onConflict: 'external_uid', count: 'exact' });
  if (error) throw error;
  console.log(`Upserted ${count ?? rows.length} event(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
