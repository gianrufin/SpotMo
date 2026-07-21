-- ============================================================================
-- SpotMo — Supabase schema, security policies, and admin gate
-- Paste this whole file into the Supabase SQL editor and click "Run".
-- ============================================================================

-- 1) Admins allowlist -------------------------------------------------------
create table if not exists public.admins (
  id         uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Safe to re-run on a table created before this column existed.
alter table public.admins add column if not exists created_at timestamptz not null default now();
alter table public.admins enable row level security;

-- A signed-in user may check whether THEY are an admin (only their own row).
drop policy if exists "read self admin" on public.admins;
create policy "read self admin" on public.admins
  for select using (id = auth.uid());

-- SECURITY DEFINER so policies can call it without exposing the admins table.
create or replace function public.is_admin()
  returns boolean
  language sql
  security definer
  stable
as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- Admins can see the full admin roster (to know who's already promoted),
-- promote any signed-up user to admin, and demote another admin — but never
-- themselves, and never the very first admin ever created (this project's
-- founding admin), so the community can never lock everyone out.
drop policy if exists "admin can read all admins" on public.admins;
create policy "admin can read all admins" on public.admins
  for select using (public.is_admin());

drop policy if exists "admin can add admins" on public.admins;
create policy "admin can add admins" on public.admins
  for insert with check (public.is_admin());

drop policy if exists "admin can remove other admins" on public.admins;
create policy "admin can remove other admins" on public.admins
  for delete using (
    public.is_admin()
    and id <> auth.uid()
    and id <> (select id from public.admins order by created_at asc limit 1)
  );

-- 2) Events -----------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null,
  poster_url  text,
  lat         double precision not null,
  lng         double precision not null,
  venue       text not null,
  address     text,
  city        text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  price_label text,
  is_free     boolean not null default true,
  description text,
  lineup      text[],
  highlights  text[],
  ticket_url  text,
  organizer   text,
  organizer_instagram text,
  organizer_id uuid references auth.users (id) on delete cascade,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);
-- Safe to re-run on a table created before this column existed.
alter table public.events add column if not exists organizer_instagram text;
-- `external_uid` + `source` support auto-published imports from external
-- calendars (e.g. scripts/import-comedymanila.mjs). Organizer-submitted
-- events leave both null/default; Postgres allows unlimited nulls under a
-- plain unique constraint, so this never collides with real submissions.
-- These importers write via the Supabase *service role* key, which bypasses
-- RLS entirely — that's what lets them insert directly as 'approved'
-- (auto-published, skipping the admin queue) instead of going through the
-- normal organizer "insert own pending" policy below.
alter table public.events add column if not exists external_uid text unique;
alter table public.events add column if not exists source text not null default 'organizer';
alter table public.events enable row level security;

-- READ: everyone sees approved events; organizers see their own; admins see all
drop policy if exists "read approved" on public.events;
create policy "read approved" on public.events
  for select using (status = 'approved');

drop policy if exists "read own" on public.events;
create policy "read own" on public.events
  for select using (auth.uid() = organizer_id);

drop policy if exists "admin read all" on public.events;
create policy "admin read all" on public.events
  for select using (public.is_admin());

-- INSERT: signed-in organizers create their own events, always as 'pending'
drop policy if exists "insert own pending" on public.events;
create policy "insert own pending" on public.events
  for insert with check (auth.uid() = organizer_id and status = 'pending');

-- UPDATE: organizers may edit their own event any time, at any status —
-- approving/rejecting/reverting the status itself is admin-only, enforced
-- below by a trigger (not just this policy), so a crafted request can't
-- sneak a status change past the UI.
drop policy if exists "update own pending" on public.events;
drop policy if exists "update own event" on public.events;
create policy "update own event" on public.events
  for update using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

drop policy if exists "admin update" on public.events;
create policy "admin update" on public.events
  for update using (public.is_admin()) with check (public.is_admin());

-- Belt-and-suspenders: no matter what an update sends, a non-admin can never
-- change status away from what it already was — only admins can approve,
-- reject, or otherwise change moderation status.
create or replace function public.preserve_event_status()
  returns trigger
  language plpgsql
  security definer
as $$
begin
  if not public.is_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_preserve_event_status on public.events;
create trigger trg_preserve_event_status
  before update on public.events
  for each row
  execute function public.preserve_event_status();

-- DELETE: organizers may remove their own; admins may remove anything (spam)
drop policy if exists "delete own" on public.events;
create policy "delete own" on public.events
  for delete using (auth.uid() = organizer_id);

drop policy if exists "admin delete" on public.events;
create policy "admin delete" on public.events
  for delete using (public.is_admin());

-- 3) Organizers roster ------------------------------------------------------
-- The admin-managed roster of organizers/venues/productions. A row starts as
-- a public, email-only *request*; only the admin can approve, edit, revoke,
-- or delete it. Only an *approved* row lets that email's account submit
-- events — this is enforced below at the database level, not just in the UI.
create table if not exists public.organizers (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  org_name     text,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'revoked')),
  user_id      uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  created_by   text not null default 'request'
               check (created_by in ('request', 'admin')),
  request_note text,
  instagram_url text
);
-- Safe to re-run on a table created before these columns existed.
alter table public.organizers add column if not exists request_note text;
alter table public.organizers add column if not exists instagram_url text;
create unique index if not exists organizers_email_key
  on public.organizers (lower(email));
alter table public.organizers enable row level security;

-- Anyone can submit a request — email only, always unapproved/unclaimed.
drop policy if exists "public can request organizer access" on public.organizers;
create policy "public can request organizer access" on public.organizers
  for insert
  with check (status = 'pending' and user_id is null and created_by = 'request');

-- The admin has full control: view all, add directly, edit, approve,
-- revoke, or delete any row.
drop policy if exists "admin manage organizers" on public.organizers;
create policy "admin manage organizers" on public.organizers
  for all using (public.is_admin()) with check (public.is_admin());

-- A signed-in user may always read their OWN row (by email), regardless of
-- status, so the app can show "pending" / "revoked" / etc.
drop policy if exists "read own organizer row" on public.organizers;
create policy "read own organizer row" on public.organizers
  for select using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Once approved, that person may update their OWN row — to link their new
-- account (user_id) the first time they sign in, and to edit their
-- org/venue/production name later. They can never touch anyone else's row
-- or change their own status.
drop policy if exists "approved organizer manages own row" on public.organizers;
create policy "approved organizer manages own row" on public.organizers
  for update
  using (status = 'approved' and lower(email) = lower(auth.jwt() ->> 'email'))
  with check (status = 'approved' and lower(email) = lower(auth.jwt() ->> 'email'));

-- Lets the public check request status (pending/approved/revoked/none)
-- before an account exists, without exposing the full roster.
create or replace function public.check_organizer_status(p_email text)
  returns json
  language sql
  security definer
  stable
as $$
  select coalesce(
    (select json_build_object('status', status, 'has_account', user_id is not null)
     from public.organizers where lower(email) = lower(p_email) limit 1),
    json_build_object('status', 'none', 'has_account', false)
  );
$$;
grant execute on function public.check_organizer_status(text) to anon, authenticated;

-- SECURITY DEFINER so the events policy below can call it safely.
create or replace function public.is_approved_organizer()
  returns boolean
  language sql
  security definer
  stable
as $$
  select exists (
    select 1 from public.organizers
    where lower(email) = lower(auth.jwt() ->> 'email') and status = 'approved'
  );
$$;

-- Re-gate event submission: only an *approved* organizer's account, or the
-- admin (who can also add/edit their own events), may submit events.
drop policy if exists "insert own pending" on public.events;
create policy "insert own pending" on public.events
  for insert with check (
    auth.uid() = organizer_id
    and status = 'pending'
    and (public.is_admin() or public.is_approved_organizer())
  );

-- 4) Event engagement — real view/save counts, surfaced to organizers (and
--    admin) as a concrete metric for pitching a future paid partnership.
alter table public.events add column if not exists view_count integer not null default 0;
alter table public.events add column if not exists save_count integer not null default 0;

-- Anonymous per-device saves. A device can only ever hold one save row per
-- event (primary key), so save_count below is always an accurate count of
-- distinct devices that currently have it saved — not an inflatable running
-- total that a repeated save/unsave toggle could drift.
create table if not exists public.event_saves (
  event_id   uuid not null references public.events(id) on delete cascade,
  device_id  text not null,
  created_at timestamptz not null default now(),
  primary key (event_id, device_id)
);
alter table public.event_saves enable row level security;

-- Saving is anonymous and device-scoped, not identity-scoped (the Saved tab
-- works with no sign-in), so device_id is self-asserted rather than verified
-- against auth — an acceptable trade-off for a vanity engagement metric,
-- not an access-control boundary.
drop policy if exists "anyone can save" on public.event_saves;
create policy "anyone can save" on public.event_saves
  for insert with check (true);
drop policy if exists "anyone can unsave" on public.event_saves;
create policy "anyone can unsave" on public.event_saves
  for delete using (true);
drop policy if exists "saves are publicly countable" on public.event_saves;
create policy "saves are publicly countable" on public.event_saves
  for select using (true);

create or replace function public.sync_event_save_count()
  returns trigger
  language plpgsql
  security definer
as $$
begin
  update public.events
  set save_count = (
    select count(*) from public.event_saves
    where event_id = coalesce(new.event_id, old.event_id)
  )
  where id = coalesce(new.event_id, old.event_id);
  return null;
end;
$$;

drop trigger if exists trg_sync_save_count on public.event_saves;
create trigger trg_sync_save_count
  after insert or delete on public.event_saves
  for each row
  execute function public.sync_event_save_count();

-- View counts are a plain incrementing counter — the client dedupes repeat
-- views within one browser session before calling this, so it stays a
-- meaningful "who actually looked at this" number rather than inflating on
-- every re-open. SECURITY DEFINER so any visitor (not just the organizer/
-- admin who can UPDATE events) can bump it.
create or replace function public.increment_view_count(p_event_id uuid)
  returns void
  language sql
  security definer
as $$
  update public.events set view_count = view_count + 1 where id = p_event_id;
$$;
grant execute on function public.increment_view_count(uuid) to anon, authenticated;

-- 4b) Performance indexes — the events table has no index beyond its primary
-- key and the external_uid unique constraint, so every query the app makes
-- (map's "approved" query, an organizer's "mine", the admin's "all") does a
-- full sequential scan. That was fine with a handful of rows; after the
-- national-platform importers landed several hundred rows (many with large
-- inline base64 poster_url values), the same scans started taking multiple
-- seconds and sometimes hit Postgres's statement_timeout entirely — which
-- the app silently swallowed as "no events" instead of an error. These
-- indexes match the app's actual query shapes:
--   - read approved / map query:      where status = 'approved' order by starts_at
--   - organizer's "mine" + RLS:       where organizer_id = ...
--   - admin's "all" query:            order by created_at desc
create index if not exists events_status_starts_at_idx on public.events (status, starts_at);
create index if not exists events_organizer_id_idx on public.events (organizer_id);
create index if not exists events_created_at_idx on public.events (created_at desc);

-- 5) Realtime — so admin approvals / organizer changes show up live for
--    everyone with the app open, with no manual refresh needed.
do $$
begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.organizers;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- 6) Make yourself the admin  (run AFTER you have signed up in the app once)
--    Replace the email in ALL THREE queries below with the one you signed up
--    with, then run just this block. It tells you exactly what happened:
--    - Query 1 returns no rows  -> you haven't signed up in the app yet with
--      this exact email. Sign up first, THEN come back and run this block.
--    - Query 3's is_admin column is true -> you're done, sign out/in the app.
--
--    select id, email, created_at from auth.users
--    where lower(email) = lower('you@email.com');
--
--    insert into public.admins (id)
--    select id from auth.users where lower(email) = lower('you@email.com')
--    on conflict do nothing;
--
--    select u.email, u.id, (a.id is not null) as is_admin
--    from auth.users u
--    left join public.admins a on a.id = u.id
--    where lower(u.email) = lower('you@email.com');
-- ============================================================================
