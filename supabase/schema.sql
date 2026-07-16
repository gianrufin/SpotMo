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

-- ============================================================================
-- 3) Make yourself the admin  (run AFTER you have signed up in the app once)
--    Replace the email with the one you signed up with, then run just this:
--
--    insert into public.admins (id)
--    select id from auth.users where email = 'you@email.com'
--    on conflict do nothing;
-- ============================================================================
