# Connecting SpotMo to a free Supabase backend

This turns SpotMo into a real multi-user app: organizers sign up and submit
events to a shared database, and **only the admin (you) can approve, decline, or
review** them — enforced on the server by Row-Level Security, not just in the UI.
It runs entirely on Supabase's free tier (no credit card).

Until it's configured, the app keeps working exactly as before (local, on-device).

## One-time setup (~10 minutes)

1. **Create a project** — go to [supabase.com](https://supabase.com), sign up
   (free), and create a new project. Pick any name and a database password
   (you won't need the password again). Wait ~2 minutes for it to provision.

2. **Run the schema** — in the project, open **SQL Editor → New query**, paste
   the entire contents of [`supabase/schema.sql`](./supabase/schema.sql), and
   click **Run**. This creates the `events` + `admins` tables and all the
   security rules.

3. **(Recommended) Skip email confirmation** — go to **Authentication →
   Sign In / Providers → Email** and turn **"Confirm email" OFF**, then Save.
   This lets organizers sign in immediately instead of clicking an email link.

4. **Grab your keys** — go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public** key (a long token — this one is safe to ship in a web app;
     the security comes from the rules in step 2, not from hiding this key)

5. **Send me those two values + the email you'll use as admin.** I'll add them,
   rebuild, and deploy.

6. **Become the admin** — after the app is connected, open it, go to
   **Profile → Organizer dashboard**, and **sign up** with your admin email.
   Then back in Supabase **SQL Editor**, run (with your email):

   ```sql
   insert into public.admins (id)
   select id from auth.users where email = 'you@email.com'
   on conflict do nothing;
   ```

   Now **Profile → Moderation queue** will let you (and only you) approve or
   decline submitted events.

## How it works once connected

- **Organizers** sign up (email + password) and submit events → stored as
  `pending` in the shared database.
- **The map** shows the built-in curated events **plus** any event you've
  **approved** — visible to everyone, on every device.
- **You (admin)** see all submissions in the moderation queue and are the only
  account allowed to change an event's status. Even a tampered client can't
  approve events — the database rejects it.

## Local development / self-hosting

The app reads two build-time variables:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Put them in a `.env` file at the repo root (git-ignored) and rebuild. If they're
absent, SpotMo silently falls back to on-device local mode.
