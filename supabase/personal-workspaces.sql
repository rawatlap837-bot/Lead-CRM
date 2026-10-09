-- Run after page-access.sql and flexible-imports.sql in Supabase SQL Editor.
-- Existing page policies use crm_can_manage_source, so this extends their
-- checks without adding a permissive policy or granting administrator roles.
begin;

create or replace function public.crm_personal_source() returns text
language sql stable set search_path = public
as $$
  select case when auth.uid() is not null
    then 'Personal leads / ' || auth.uid()::text
    else null end
$$;

create or replace function public.crm_can_manage_source(page_source text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (
    public.crm_is_admin()
    or page_source = public.crm_personal_source()
    or exists (
      select 1 from public.crm_page_members
      where source = page_source and email = lower(auth.jwt()->>'email')
    )
  )
$$;

create or replace function public.crm_access_context() returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'is_admin', public.crm_is_admin(),
    'personal_source', public.crm_personal_source(),
    'sources', coalesce((
      select jsonb_agg(source order by source)
      from (
        select source from public.crm_page_members
        where email = lower(auth.jwt()->>'email')
        union
        select public.crm_personal_source()
        where auth.uid() is not null
      ) accessible_sources
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.crm_personal_source() from public;
grant execute on function public.crm_personal_source() to authenticated;
revoke all on function public.crm_can_manage_source(text), public.crm_access_context() from public;
grant execute on function public.crm_can_manage_source(text), public.crm_access_context() to authenticated;

notify pgrst, 'reload schema';
commit;
