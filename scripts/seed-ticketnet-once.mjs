#!/usr/bin/env node
/**
 * One-time seed: TicketNet events (Araneta Coliseum / New Frontier Theater /
 * Gateway Cineplex 18), captured 2026-07-21 via scripts/import-ticketnet.mjs run
 * locally (this sandbox can reach ticketnet.com.ph fine; GitHub Actions'
 * runner IPs get a hard 403 from their WAF regardless of headers/retries —
 * see the commit history on import-ticketnet.mjs). Rather than keep fighting
 * that block, this is a single manual seed of the seen a real dry run
 * already validated: exact rows, hardcoded, no live fetch of the site at all.
 *
 * This script and its matching workflow step are meant to be deleted right
 * after this runs once — there is no ongoing TicketNet automation.
 *
 * Without SUPABASE_SERVICE_ROLE_KEY set, this runs in dry-run mode: it only
 * logs the rows it *would* upsert — never writes — so it's safe to run
 * locally.
 */

const ROWS = [
  {
    "external_uid": "import:ticketnet-/event-detail/WRten-by-Wilbert-Ross-0",
    "source": "import:ticketnet",
    "title": "WILBERT ROSS (Day 1)",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/WRd2_303.jpg",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-07-25T12:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "WRten by Wilbert Ross 1st MAJOR & 10th ANNIVERSARY CONCERT. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/WRten-by-Wilbert-Ross",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/WRten-by-Wilbert-Ross-1",
    "source": "import:ticketnet",
    "title": "WILBERT ROSS (Day 2)",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/WRd2_303.jpg",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-07-26T12:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "WRten by Wilbert Ross 1st MAJOR & 10th ANNIVERSARY CONCERT. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/WRten-by-Wilbert-Ross",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/Genrewind-Connect-x-Wealth-Coach-0",
    "source": "import:ticketnet",
    "title": "Chinkee Tan, Brod Pete, Cianne Dominguez, & Serenity Band",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/GENREWINDPOSTER.jpg",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-01T11:30:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "Genrewind Connect x Wealth Coach. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/Genrewind-Connect-x-Wealth-Coach",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/PondPhuwin-0",
    "source": "import:ticketnet",
    "title": "PONDPHUWIN",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/Pondphuwin2026Poster.jpg",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-02T07:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "PondPhuwin \"Rendezvous\" FanCon in Manila. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/PondPhuwin",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/CINEMALAYA-2026-0",
    "source": "import:ticketnet",
    "title": "CINEMALAYA 2026 SET A",
    "category": "art",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/SET A web poster.jpg",
    "lat": 14.6212635,
    "lng": 121.0530284,
    "venue": "GATEWAY CINEPLEX 18",
    "address": "The Coffee Bean & Tea Leaf, General Roxas Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-07T04:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "CINEMALAYA 2026. Live at GATEWAY CINEPLEX 18.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/CINEMALAYA-2026",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/CINEMALAYA-2026-SET-B-0",
    "source": "import:ticketnet",
    "title": "CINEMALAYA 2026 SET B",
    "category": "art",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/SET B web poster.jpg",
    "lat": 14.6212635,
    "lng": 121.0530284,
    "venue": "GATEWAY CINEPLEX 18",
    "address": "The Coffee Bean & Tea Leaf, General Roxas Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-07T04:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "CINEMALAYA 2026 SET B. Live at GATEWAY CINEPLEX 18.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/CINEMALAYA-2026-SET-B",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/MAMAMOO-2026-WORLD-TOUR-0",
    "source": "import:ticketnet",
    "title": "MAMAMOO",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/303_MAMAMOO2026.jpg",
    "lat": 14.6207157,
    "lng": 121.0533557,
    "venue": "SMART ARANETA COLISEUM",
    "address": "Smart Araneta Coliseum, General Araneta Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-08T10:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "MAMAMOO 2026 WORLD TOUR. Live at SMART ARANETA COLISEUM.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/MAMAMOO-2026-WORLD-TOUR",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/DUSTBIA-LOVE-ACTUALLY-0",
    "source": "import:ticketnet",
    "title": "BIANCA DE VERA AND DUSTIN YU",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/DUSTBIA_303x430.png",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-08T11:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "DUSTBIA LOVE, ACTUALLY. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/DUSTBIA-LOVE-ACTUALLY",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/LEEHI-2026-0",
    "source": "import:ticketnet",
    "title": "LEEHI",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/Leehi2026TickettPoster.jpg",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-11T12:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "LEEHI & 808 HI RECORDINGS WORLD TOUR 2026. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/LEEHI-2026",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/TOAST-The-Best-of-BREAD-0",
    "source": "import:ticketnet",
    "title": "TOAST The Best of BREAD",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/toast303x430.jpg",
    "lat": 14.6207157,
    "lng": 121.0533557,
    "venue": "SMART ARANETA COLISEUM",
    "address": "Smart Araneta Coliseum, General Araneta Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-12T12:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "toast the best of bread. Live at SMART ARANETA COLISEUM.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/TOAST-The-Best-of-BREAD",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/VIVA-ALL-STAR-GAMES-2026-0",
    "source": "import:ticketnet",
    "title": "VIVA ALL STAR",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/VIVA_303_1.jpg",
    "lat": 14.6207157,
    "lng": 121.0533557,
    "venue": "SMART ARANETA COLISEUM",
    "address": "Smart Araneta Coliseum, General Araneta Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-16T08:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "VIVA ALL STAR GAMES 2026. Live at SMART ARANETA COLISEUM.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/VIVA-ALL-STAR-GAMES-2026",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/RE-CODE-2026-EVERGLOW-WORLD-TOUR-IN-MANILA-0",
    "source": "import:ticketnet",
    "title": "EVERGLOW",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/5. Event Poster - 303x430.jpg",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-21T11:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "[RE:CODE] 2026 EVERGLOW WORLD TOUR IN MANILA. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/RE-CODE-2026-EVERGLOW-WORLD-TOUR-IN-MANILA",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/Aquinse-0",
    "source": "import:ticketnet",
    "title": "ANGELINE QUINTO",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/AngelineQuinto2026EventPoster.jpg",
    "lat": 14.6207157,
    "lng": 121.0533557,
    "venue": "SMART ARANETA COLISEUM",
    "address": "Smart Araneta Coliseum, General Araneta Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-22T11:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "AQUINSE: ANGELINE QUINTO CONCERT. Live at SMART ARANETA COLISEUM.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/Aquinse",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/LOVE-LIKE-ASHTINE-0",
    "source": "import:ticketnet",
    "title": "ASHTINE OLVIGA",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/Ashtine_303x430.jpg",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-22T12:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "LOVE LIKE ASHTINE. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/LOVE-LIKE-ASHTINE",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/THE-CLICK-FIVE-0",
    "source": "import:ticketnet",
    "title": "The Click Five",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/TheClickFivePoster.jpg",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-25T12:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "The Click Five For Lovers Tour. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/THE-CLICK-FIVE",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/Yeng-Constantino-Biyaheng-Bente-0",
    "source": "import:ticketnet",
    "title": "Yeng Constantino (Day 1)",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/BB_303.png",
    "lat": 14.6207157,
    "lng": 121.0533557,
    "venue": "SMART ARANETA COLISEUM",
    "address": "Smart Araneta Coliseum, General Araneta Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-28T12:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "Yeng Constantino Biyaheng Bente. Live at SMART ARANETA COLISEUM.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/Yeng-Constantino-Biyaheng-Bente",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/Yeng-Constantino-Biyaheng-Bente-1",
    "source": "import:ticketnet",
    "title": "Yeng Constantino (Day 2)",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/BB_303.png",
    "lat": 14.6207157,
    "lng": 121.0533557,
    "venue": "SMART ARANETA COLISEUM",
    "address": "Smart Araneta Coliseum, General Araneta Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-08-29T12:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "Yeng Constantino Biyaheng Bente. Live at SMART ARANETA COLISEUM.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/Yeng-Constantino-Biyaheng-Bente",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  },
  {
    "external_uid": "import:ticketnet-/event-detail/Heath-Jornales-NFT-0",
    "source": "import:ticketnet",
    "title": "HEATH JORNALES",
    "category": "music",
    "poster_url": "https://dohyi8q62t82e.cloudfront.net/files/events/poster/EVENT POSTER.png",
    "lat": 14.6223299,
    "lng": 121.0540038,
    "venue": "NEW FRONTIER THEATER",
    "address": "New Frontier Theater, General Aguinaldo Avenue, Araneta City, Socorro, Cubao, 3rd District, Quezon City, Eastern Manila District, Metro Manila, 1109, Philippines",
    "city": "Quezon City",
    "starts_at": "2026-09-05T11:00:00.000Z",
    "ends_at": null,
    "price_label": null,
    "is_free": false,
    "description": "HEATH'S TIME: HEATH JORNALES LIVE IN CONCERT. Live at NEW FRONTIER THEATER.",
    "lineup": [],
    "ticket_url": "https://www.ticketnet.com.ph/event-detail/Heath-Jornales-NFT",
    "organizer": "TicketNet",
    "organizer_id": null,
    "status": "pending"
  }
];

const dryRun = !process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log(dryRun ? '[dry-run] no SUPABASE_SERVICE_ROLE_KEY set — logging only, no writes' : 'live run — will upsert to Supabase');
  console.log(`${ROWS.length} event(s) to seed:`);
  for (const r of ROWS) {
    console.log(`  • ${r.title} — ${r.starts_at} @ ${r.venue}`);
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
    .upsert(ROWS, { onConflict: 'external_uid', count: 'exact' });
  if (error) throw error;
  console.log(`Upserted ${count ?? ROWS.length} event(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
