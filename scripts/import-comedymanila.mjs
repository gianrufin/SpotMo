#!/usr/bin/env node
/**
 * Auto-publish importer: Comedy Manila (comedymanila.ph) → SpotMo events.
 *
 * Source: their site runs "The Events Calendar" (WordPress), which exposes a
 * standard iCalendar feed (not RSS) at ICS_URL below. We parse it, geocode
 * each venue with OSM Nominatim (free, keyless), and upsert straight to
 * status: 'approved' — these are auto-published, not queued for admin review.
 *
 * Runs on a schedule via .github/workflows/import-comedymanila.yml, using the
 * Supabase *service role* key (bypasses RLS; never expose this client-side).
 * Without SUPABASE_SERVICE_ROLE_KEY set, this runs in dry-run mode: it parses
 * and geocodes but only logs — never writes — so it's safe to run locally.
 *
 * Known quirk: this feed's DTSTART is tagged TZID=UTC but the clock values
 * are actually Philippine local time (Comedy Manila only runs Manila-area
 * shows in the evening; treating "20:30" as true UTC would mean 4:30am PHT,
 * which none of these events are). We treat the wall-clock time as
 * Asia/Manila (UTC+8) and convert to a real UTC instant from there.
 */

const ICS_URL = 'https://comedymanila.ph/?post_type=tribe_events&ical=1&eventDisplay=list';
const SOURCE_TAG = 'import:comedymanila';
const ORGANIZER_NAME = 'Comedy Manila';
const CATEGORY = 'comedy';
const MANILA_UTC_OFFSET_HOURS = 8;
const NOMINATIM_UA = 'SpotMo-EventImporter/1.0 (https://gianrufin.github.io/SpotMo/)';

const dryRun = !process.env.SUPABASE_SERVICE_ROLE_KEY;

function unfoldLines(raw) {
  // RFC5545: a line starting with a space/tab is a continuation of the previous line.
  const lines = raw.split(/\r\n|\n|\r/);
  const out = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeIcsValue(value) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseVEvents(icsText) {
  const lines = unfoldLines(icsText);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const rawKey = line.slice(0, colonIdx);
    const rawValue = line.slice(colonIdx + 1);
    const [key, ...paramParts] = rawKey.split(';');
    const params = {};
    for (const p of paramParts) {
      const [pk, pv] = p.split('=');
      if (pk) params[pk.toUpperCase()] = pv;
    }
    current[key.toUpperCase()] = { value: unescapeIcsValue(rawValue), params };
  }
  return events;
}

function parseIcsDate(raw) {
  // Format: YYYYMMDDTHHMMSS — interpreted as Asia/Manila wall-clock time
  // regardless of the (mislabeled) TZID param; see file header.
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(raw);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, h, mi, s) - MANILA_UTC_OFFSET_HOURS * 3600_000;
  return new Date(utcMs).toISOString();
}

function extractPriceLabel(description) {
  const m = /Ticket:\s*(.+?)(?:\s{2,}|\n|$)/i.exec(description || '');
  return m ? m[1].trim() : null;
}

async function geocode(query) {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — parsing/geocoding only, no writes' : 'live run — will upsert to Supabase');

  const res = await fetch(ICS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SpotMo-EventImporter/1.0; +https://gianrufin.github.io/SpotMo/)',
      Accept: 'text/calendar, text/plain, */*',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ICS feed: HTTP ${res.status}`);
  const icsText = await res.text();
  const rawEvents = parseVEvents(icsText);
  console.log(`Parsed ${rawEvents.length} VEVENT entries from the feed.`);

  const now = Date.now();
  const rows = [];
  for (const ev of rawEvents) {
    const uid = ev.UID?.value;
    const title = ev.SUMMARY?.value;
    const startsAt = ev.DTSTART?.value ? parseIcsDate(ev.DTSTART.value) : null;
    if (!uid || !title || !startsAt) {
      console.warn('Skipping malformed entry (missing uid/title/start):', ev.SUMMARY?.value ?? '(untitled)');
      continue;
    }
    if (new Date(startsAt).getTime() < now - 3600_000) {
      continue; // already past — don't import stale shows
    }

    const locationText = ev.LOCATION?.value?.trim();
    const description = ev.DESCRIPTION?.value ?? '';
    const lineup = ev.CATEGORIES?.value
      ? ev.CATEGORIES.value.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const posterUrl = ev.ATTACH?.value ?? null;
    const ticketUrl = ev.URL?.value ?? null;
    const priceLabel = extractPriceLabel(description);

    let geo = null;
    if (locationText) {
      geo = await geocode(`${locationText}, Philippines`);
      await sleep(1100); // be a good Nominatim citizen: max ~1 req/sec
    }
    if (!geo) {
      console.warn(`Skipping "${title}" — could not geocode venue "${locationText}".`);
      continue;
    }

    rows.push({
      external_uid: uid,
      source: SOURCE_TAG,
      title,
      category: CATEGORY,
      poster_url: posterUrl,
      lat: geo.lat,
      lng: geo.lng,
      venue: locationText || title,
      address: geo.address,
      city: geo.city,
      starts_at: startsAt,
      ends_at: null,
      price_label: priceLabel,
      is_free: false,
      description: lineup.length
        ? `Stand-up comedy night featuring ${lineup.join(', ')}.`
        : 'A Comedy Manila stand-up show.',
      lineup,
      ticket_url: ticketUrl,
      organizer: ORGANIZER_NAME,
      organizer_id: null,
      status: 'approved',
    });
  }

  console.log(`${rows.length} upcoming, geocoded event(s) ready to import:`);
  for (const r of rows) {
    console.log(`  • ${r.title} — ${r.starts_at} @ ${r.venue} (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) [${r.city ?? 'city unknown'}]`);
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
