<div align="center">

# SpotMo

**Find it. Save it. Go to it.**

A poster-first, map-first app for discovering local gigs, art shows, markets, and
community events across the Philippines.

</div>

---

## What it is

SpotMo is a clean, premium, mobile-first web app. Open it, see a live map of what's
happening nearby, tap a poster pin, view the event, then save it or get directions —
with optional external ticket links. No feed, no chat, no noise.

**Primary flow:** open → map → tap pin → poster + details → navigate / save → (optional) tickets.

## Features

- 🗺️ **Live map** with poster-thumbnail pins, **color-coded by date** (Today / Tomorrow / This week / Later)
- 🔍 **Search & filters** — by event, venue, or artist; date, category, and free/paid — all keeping map context
- 🎟️ **Poster-first event pages** — About / Venue tabs, highlights, lineup, Navigate, Save, external Get Tickets, Share
- ❤️ **Saved** events (Events / Venues), persisted locally
- 🧭 **Discover** — browse by category, Near You, and curated picks
- ✍️ **Organizer flow** — a 3-step create-event submission (poster → details → review)
- 🛡️ **Admin moderation** — approve / reject / remove; only approved events reach the map
- 🚀 **Splash & onboarding** with a location-permission step

## Tech stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** for the brand design system
- **react-leaflet + Leaflet** with keyless CARTO Positron basemap tiles
- **framer-motion** for sheet / card / logo motion
- **lucide-react** outlined icons
- **localStorage** for saved events, onboarding state, and organizer submissions (no backend for MVP)

## Brand

| Token | Value |
| --- | --- |
| Accent (emerald) | `#10B981` |
| Ink | `#111827` |
| Muted | `#6B7280` |
| Surface | `#F1F5F9` |
| Typography | Instrument Serif (titles) · Inter 300 (everything else) |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # type-check + production bundle → dist/
npm run preview  # preview the production build
```

## Project structure

```
src/
  components/   common UI, map, event, and card components
  screens/      onboarding, map, saved, discover, profile, organizer, admin
  layout/       phone frame + bottom navigation
  lib/          hooks (saved, onboarding, submissions, location) + formatting/filters
  data/         curated PH events + category definitions
  types.ts      shared types
```

## Notes for MVP scope

No in-app ticketing (external links only), no chat, no social feed, no artist profiles.
Data is curated mock data with all state persisted client-side, structured so a real
backend/API is a drop-in swap later.
