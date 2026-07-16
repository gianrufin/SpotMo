-- ============================================================================
-- SpotMo — Supabase schema, security policies, and admin gate
-- Paste this whole file into the Supabase SQL editor and click "Run".
-- ============================================================================

-- 1) Admins allowlist -------------------------------------------------------
create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade
);
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
  organizer_id uuid references auth.users (id) on delete cascade,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);
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

-- UPDATE: organizers may edit their own event but cannot change its status
-- away from pending; only admins can approve / reject / edit anything.
drop policy if exists "update own pending" on public.events;
create policy "update own pending" on public.events
  for update using (auth.uid() = organizer_id and status = 'pending')
  with check (auth.uid() = organizer_id and status = 'pending');

drop policy if exists "admin update" on public.events;
create policy "admin update" on public.events
  for update using (public.is_admin()) with check (public.is_admin());

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
               check (created_by in ('request', 'admin'))
);
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

-- ============================================================================
-- 4) Make yourself the admin  (run AFTER you have signed up in the app once)
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
