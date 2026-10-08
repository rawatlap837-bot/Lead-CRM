-- Run once in Supabase SQL Editor. Replaces broad lead/follow-up policies.
begin;
create table if not exists public.crm_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.crm_page_members (
 source text not null check(length(btrim(source)) between 1 and 200),
 email text not null check(email = lower(btrim(email))),
 invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(source,email)
);
alter table public.crm_admins enable row level security;
alter table public.crm_page_members enable row level security;
revoke all on public.crm_admins, public.crm_page_members from anon, authenticated;
grant select on public.crm_admins to authenticated;
grant select, delete on public.crm_page_members to authenticated;

create or replace function public.crm_is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.crm_admins where user_id = auth.uid()) $$;
create or replace function public.crm_can_manage_source(page_source text) returns boolean
language sql stable security definer set search_path = public
as $$ select public.crm_is_admin() or exists(
 select 1 from public.crm_page_members
 where source = page_source and email = lower(auth.jwt()->>'email')
) $$;
create or replace function public.crm_access_context() returns jsonb
language sql stable security definer set search_path = public
as $$ select jsonb_build_object(
 'is_admin',public.crm_is_admin(),
 'sources',coalesce((select jsonb_agg(source order by source) from public.crm_page_members
 where email = lower(auth.jwt()->>'email')), '[]'::jsonb)
) $$;
revoke all on function public.crm_is_admin(),public.crm_can_manage_source(text),public.crm_access_context() from public;
grant execute on function public.crm_is_admin(),public.crm_can_manage_source(text),public.crm_access_context() to authenticated;
drop policy if exists "Read own admin role" on public.crm_admins;
create policy "Read own admin role" on public.crm_admins for select to authenticated using(user_id=auth.uid());
drop policy if exists "Admin reads page members" on public.crm_page_members;
create policy "Admin reads page members" on public.crm_page_members for select to authenticated using(public.crm_is_admin());
drop policy if exists "Admin revokes page members" on public.crm_page_members;
create policy "Admin revokes page members" on public.crm_page_members for delete to authenticated using(public.crm_is_admin());

-- Removing permissive policies is essential: Postgres ORs permissive policies.
do $$ declare p record; begin
 for p in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('leads','followups')
 loop execute format('drop policy %I on public.%I',p.policyname,p.tablename); end loop;
end $$;
alter table public.leads enable row level security;
alter table public.followups enable row level security;
revoke all on public.leads, public.followups from anon;
grant select,insert,update,delete on public.leads,public.followups to authenticated;
create policy "Manage allowed page leads" on public.leads for all to authenticated
 using(public.crm_can_manage_source(source)) with check(public.crm_can_manage_source(source));
create policy "Manage allowed page followups" on public.followups for all to authenticated
 using(exists(select 1 from public.leads l where l.id=followups.lead_id and public.crm_can_manage_source(l.source)))
 with check(exists(select 1 from public.leads l where l.id=followups.lead_id and public.crm_can_manage_source(l.source)));
-- Previous Pixel metadata is administration-only too.
do $$ declare p record; begin
 if to_regclass('public.crm_integrations') is not null then
  for p in select policyname from pg_policies where schemaname='public' and tablename='crm_integrations'
  loop execute format('drop policy %I on public.crm_integrations',p.policyname); end loop;
  execute 'alter table public.crm_integrations enable row level security';
  execute 'revoke all on public.crm_integrations from anon';
  execute 'create policy "Admin manages connection metadata" on public.crm_integrations for all to authenticated using(public.crm_is_admin()) with check(public.crm_is_admin())';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
