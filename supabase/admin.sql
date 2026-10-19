-- Run this in the Supabase SQL editor of the SAME project the main app uses.
-- Safe to re-run.
--
-- The admin app ships no service_role key. Everything below is enforced by RLS
-- against the signed-in user, so a leaked frontend key still gets you nothing.

-- ---------------------------------------------------------------------------
-- 1. The flag
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. "Am I an admin?"
--
-- SECURITY DEFINER on purpose: this is called from inside the `profiles`
-- policies, and a plain subquery there would re-enter those same policies.
-- ---------------------------------------------------------------------------

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_superadmin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC, and revoking from `anon`
-- alone leaves that default in place. Revoke from PUBLIC, then grant narrowly.
revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Read access for admins
--
-- These sit alongside the member policies. Postgres ORs permissive policies,
-- so ordinary users keep exactly the access they had.
-- ---------------------------------------------------------------------------

drop policy if exists "Superadmins read every profile" on public.profiles;
create policy "Superadmins read every profile"
  on public.profiles for select to authenticated
  using (public.is_superadmin());

drop policy if exists "Superadmins read every vote" on public.votes;
create policy "Superadmins read every vote"
  on public.votes for select to authenticated
  using (public.is_superadmin());

drop policy if exists "Superadmins read every caption" on public.generations;
create policy "Superadmins read every caption"
  on public.generations for select to authenticated
  using (public.is_superadmin());

-- ---------------------------------------------------------------------------
-- 4. Write access for admins
-- ---------------------------------------------------------------------------

drop policy if exists "Superadmins create captions" on public.generations;
create policy "Superadmins create captions"
  on public.generations for insert to authenticated
  with check (public.is_superadmin());

drop policy if exists "Superadmins delete captions" on public.generations;
create policy "Superadmins delete captions"
  on public.generations for delete to authenticated
  using (public.is_superadmin());

-- UPDATE needs a function rather than a policy. The main app revoked the
-- table-wide UPDATE privilege and granted only `generations.published`, so no
-- row policy can let an admin edit `content` -- column privileges are checked
-- before RLS and they apply to the whole `authenticated` role, which is every
-- logged-in user. A SECURITY DEFINER function runs as the table owner instead
-- and does its own authorization check.
create or replace function public.admin_update_generation(
  p_id        uuid,
  p_content   text default null,
  p_topic     text default null,
  p_published boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.generations
     set content   = coalesce(nullif(btrim(p_content), ''), content),
         topic     = coalesce(nullif(btrim(p_topic), ''), topic),
         published = coalesce(p_published, published)
   where id = p_id;
end;
$$;

revoke execute on function public.admin_update_generation(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_update_generation(uuid, text, text, boolean) to authenticated;

-- Promoting other admins, so the SQL editor is only ever needed once.
-- You cannot demote yourself: that is the step that would lock everyone out.
create or replace function public.admin_set_superadmin(
  p_user uuid,
  p_value boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_user = auth.uid() and p_value is false then
    raise exception 'refusing to remove your own admin access';
  end if;

  update public.profiles set is_superadmin = p_value where id = p_user;
end;
$$;

revoke execute on function public.admin_set_superadmin(uuid, boolean) from public, anon;
grant execute on function public.admin_set_superadmin(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Bootstrap
--
-- "If the admin area requires this flag, how do you grant yourself the first
-- one?" You do not do it through the app -- that would be a hole. You do it
-- here, in the Supabase SQL editor, which is a privileged channel you already
-- hold as the project owner. After this one statement, every later admin is
-- promoted from inside the admin UI via admin_set_superadmin().
--
-- >>> Replace the address with the one you sign in with. <<<
-- ---------------------------------------------------------------------------

update public.profiles
   set is_superadmin = true
 where email = 'sh4658@columbia.edu';

select id, email, is_superadmin from public.profiles order by created_at;
