# Daily Quip — admin console

A separate Next.js app and Vercel project that administers the **same Supabase
database** as the public [Daily Quip](https://github.com/SM5858/humor-project)
app.

| Page | What it does |
| --- | --- |
| `/` | Statistics about the database |
| `/media` | Create, read, update, delete AI generated captions |
| `/users` | Read every profile; grant or revoke admin access |
| `/votes` | Read every ballot ever cast |
| `/login` | The only route a signed-out visitor can reach |

## The wall

Every route requires a Google login **and**
`profiles.is_superadmin = true`. Three layers, none of which rely on the others:

1. **`proxy.ts`** — default deny. Only `/login` and `/auth/callback` are listed
   as public; everything else redirects a signed-out visitor.
2. **`requireSuperadmin()`** — every page and every Server Action re-reads the
   session and the flag. Server Actions accept direct POSTs, so a page-level
   check alone would not cover them.
3. **Row Level Security** — the real enforcement. This app ships **no
   `service_role` key**. It talks to Supabase with the anon key plus the
   admin's own session, so the same queries return nothing for a non-admin.
   Leaking the frontend key would give an attacker what any logged-out visitor
   already has.

## How the first admin gets in

> *If the admin area requires that flag, don't you lock yourself out?*

Yes — and that is the correct behaviour. Granting it through the app would be
the hole the wall exists to close, so the first grant happens **outside** the
app, in the Supabase SQL editor, which the project owner already controls:

```sql
update public.profiles set is_superadmin = true where email = 'you@example.com';
```

After that one statement nobody needs the SQL editor again: admins promote each
other from `/users`, and `admin_set_superadmin()` refuses to remove *your own*
access, so the room cannot be locked from the inside.

## Why UPDATE needs a function

The public app deliberately narrowed write access on captions:

```sql
revoke update on public.generations from anon, authenticated;
grant  update (published) on public.generations to authenticated;
```

Column privileges are checked *before* RLS and apply to the whole
`authenticated` role — which is every logged-in user. So no row policy can give
an admin permission to edit `content` without giving it to everyone. Editing
therefore goes through `admin_update_generation()`, a `SECURITY DEFINER`
function that runs as the table owner and does its own `is_superadmin()` check.
Insert and delete need no such trick and are plain policies.

## Statistics

Beyond the counters, the overview answers a few questions the raw tables do not:

- **Rolls per keeper** — generations spent per caption actually posted, i.e. how
  often people reroll before they are happy.
- **Humans vs Quipbot** — on topics where both a person and the house bot
  posted, who takes first place, and the average score of each.
- **Vote coverage** — the share of posted captions nobody has voted on at all.
- **When the campus is awake** — all activity bucketed by hour in New York time.
- **Most divisive caption** — the highest `min(upvotes, downvotes)`, i.e. the one
  that actually split the room rather than the one with the most votes.

Chart colours are slots 1 and 2 of a validated categorical palette, re-checked
against this app's own light and dark surfaces: all five checks pass in both
modes (worst all-pairs CVD ΔE 24.7 light / 26.8 dark).

## Setup

1. Run [`supabase/admin.sql`](supabase/admin.sql) in the SQL editor of the
   **same** Supabase project the public app uses. Change the email on the last
   statement to your own first.
2. Add this app's callback to Supabase → Authentication → URL Configuration →
   Redirect URLs. It must carry no query string:
   - `http://localhost:3100/auth/callback`
   - `https://<this-app>.vercel.app/auth/callback`
3. `cp .env.example .env.local`, fill it in, then:

```bash
npm install
npm run dev -- --port 3100
```

Port 3100 keeps it clear of the public app on 3000.

## Deploying

Same four environment variables in **Vercel → Settings → Environment
Variables**. Turn off **Deployment Protection** so the page opens in Incognito —
the login wall is this app's protection, and it is the one being graded.
