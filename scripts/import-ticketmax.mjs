#!/usr/bin/env node
/**
 * Auto-publish importer: TicketMAX.ph (ticketmax.ph) → SpotMo events.
 *
 * A national ticketing platform (not Manila-specific) — this is the first
 * of several importers meant to expand coverage beyond Metro Manila into
 * Visayas/Mindanao/South Luzon without needing a scraper per city: TicketMAX
 * lists venues nationwide, and every event page embeds full schema.org
 * Event JSON-LD *with real venue lat/lng* — no geocoding needed at all.
 *
 * Discovery: the site's sitemap-events.xml lists ~1,300+ event URLs (many
 * long past), ordered chronologically by <lastmod> — we only fetch the most
 * recently added ones (recent additions skew toward upcoming events) rather
 * than crawling the whole thing. Category listing pages were tried first but
 * are dominated by ARCHIVED/POSTPONED cards with no reliable "upcoming only"
 * view, so the sitemap tail is the more efficient discovery path.
 *
 * Category mapping is schema.org's own @type, not TicketMAX's site
 * taxonomy: MusicEvent → music (covers concerts, festivals, pyromusical
 * shows — everything except sports on this platform), SportsEvent →
 * community (same precedent as the Governors' Cup in import-ticketnet.mjs).
 *
 * Multi-category, nationwide platform + brand-new integration → stays
 * PENDING for admin review, same bar as TicketNet and SPIT Manila.
 *
 * Runs on a schedule via .github/workflows/import-ticketmax.yml, using the
 * Supabase *service role* key (bypasses RLS; never expose this client-side).
 * Without SUPABASE_SERVICE_ROLE_KEY set, this runs in dry-run mode: it parses
 * but only logs — never writes — so it's safe to run locally.
 */

const SITE_ORIGIN = 'https://www.ticketmax.ph';
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap-events.xml`;
const SOURCE_TAG = 'import:ticketmax';
const ORGANIZER_NAME = 'TicketMAX';
const STATUS = 'pending';
const UA = 'Mozilla/5.0 (compatible; SpotMo-EventImporter/1.0; +https://gianrufin.github.io/SpotMo/)';
// How many of the most-recently-added sitemap URLs to check. The sitemap is
// ~1,300 entries deep across years of past events; this window is generous
// enough to catch everything currently upcoming without crawling all of it.
const SITEMAP_WINDOW = 200;

const dryRun = !process.env.SUPABASE_SERVICE_ROLE_KEY;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Chromium's TLS/HTTP fingerprint gets blocked by some WAFs and Node's own
// fetch() got a flat 403 from a different site's WAF earlier in this
// project even where curl succeeded — shell out to curl for every fetch here
// for the same reason, with a short retry loop for transient failures.
async function fetchText(url, attempts = 3) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const { stdout } = await run(
        'curl',
        ['-sSL', '--fail', '-A', UA, url],
        { maxBuffer: 20 * 1024 * 1024 },
      );
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
  if (schemaType === 'SportsEvent') return 'community';
  return 'music'; // MusicEvent covers concerts/festivals/shows on this platform
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

function extractJsonLd(html) {
  const m = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

// Every TicketMAX event embeds a real `offers` array (schema.org Offer, one
// per ticket tier) with a numeric `price` — e.g. { name: "GENAD", price: 270,
// priceCurrency: "PHP" }. Use the actual min/max instead of guessing.
function extractPrice(offers) {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  const prices = list.map((o) => Number(o?.price)).filter((n) => Number.isFinite(n));
  if (prices.length === 0) return { priceLabel: null, isFree: false };
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  if (lo === 0 && hi === 0) return { priceLabel: 'Free', isFree: true };
  const priceLabel = lo === hi ? `₱${lo.toLocaleString('en-PH')}` : `₱${lo.toLocaleString('en-PH')}–₱${hi.toLocaleString('en-PH')}`;
  return { priceLabel, isFree: false };
}

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing only, no writes' : 'live run — will upsert to Supabase');

  const sitemapXml = await fetchText(SITEMAP_URL);
  const allUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const eventUrls = allUrls.filter((u) => u.startsWith(`${SITE_ORIGIN}/events/`) && !u.includes('/category/') && !u.includes('/page/'));
  const recent = eventUrls.slice(-SITEMAP_WINDOW);
  console.log(`Sitemap has ${eventUrls.length} event URL(s) total; checking the most recent ${recent.length}.`);

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
  let skippedParse = 0;
  let skippedPast = 0;
  let skippedCancelled = 0;
  let skippedDuplicate = 0;

  for (const url of recent) {
    let html;
    try {
      html = await fetchText(url);
    } catch (err) {
      console.warn(`Skipping ${url} — fetch failed: ${err.message.split('\n')[0]}`);
      skippedParse++;
      continue;
    }
    const ev = extractJsonLd(html);
    if (!ev || !ev.name || !ev.startDate || !ev.location?.geo) {
      skippedParse++;
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

    const venue = ev.location.name ?? ev.name;
    if (isDuplicate(ev.name, venue, dateOnly(startsAt), existingEvents)) {
      console.warn(`Skipping "${ev.name}" on ${dateOnly(startsAt)} — matches an existing event from another source.`);
      skippedDuplicate++;
      continue;
    }

    const { priceLabel, isFree } = extractPrice(ev.offers);
    const slug = url.replace(`${SITE_ORIGIN}/events/`, '').replace(/\/$/, '');
    rows.push({
      external_uid: `${SOURCE_TAG}-${slug}`,
      source: SOURCE_TAG,
      title: ev.name,
      category: classify(ev['@type']),
      poster_url: Array.isArray(ev.image) ? ev.image[0] : ev.image ?? '',
      lat: Number(ev.location.geo.latitude),
      lng: Number(ev.location.geo.longitude),
      venue,
      address: ev.location.address ?? null,
      city: null,
      starts_at: startsAt,
      ends_at: ev.endDate ? new Date(ev.endDate).toISOString() : null,
      price_label: priceLabel,
      is_free: isFree,
      description: ev.description || `${ev.name}, at ${ev.location.name ?? 'TBA'}.`,
      lineup: [],
      ticket_url: url,
      organizer: ev.organizer?.name || ORGANIZER_NAME,
      organizer_id: null,
      status: STATUS,
    });
  }

  console.log(
    `Skipped: ${skippedParse} unparseable, ${skippedPast} already past, ${skippedCancelled} cancelled, ${skippedDuplicate} duplicate of an existing event.`,
  );
  console.log(`${rows.length} upcoming event(s) ready to import:`);
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
