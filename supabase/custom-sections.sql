-- Run after personal-workspaces.sql and page-names.sql.
begin;
create table if not exists public.crm_sections (
  source text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists crm_sections_owner on public.crm_sections(owner_id);
alter table public.crm_sections enable row level security;
revoke all on public.crm_sections from anon, authenticated;
grant select on public.crm_sections to authenticated;

create or replace function public.crm_can_manage_source(page_source text)
returns boolean language sql stable security definer set search_path = public
as $$ select auth.uid() is not null and (
  public.crm_is_admin()
  or page_source = public.crm_personal_source()
  or exists(select 1 from public.crm_sections where source = page_source and owner_id = auth.uid())
  or exists(select 1 from public.crm_page_members where source = page_source and email = lower(auth.jwt()->>'email'))
) $$;

drop policy if exists "Read accessible sections" on public.crm_sections;
create policy "Read accessible sections" on public.crm_sections
for select to authenticated using(public.crm_can_manage_source(source));

create or replace function public.crm_create_section(section_name text) returns text
language plpgsql security definer set search_path = public
as $$ declare new_source text; begin
  if auth.uid() is null then raise exception 'Sign in before creating a section.'; end if;
  if section_name is null or length(btrim(section_name)) not between 1 and 200 then
    raise exception 'Enter a section name up to 200 characters.';
  end if;
  new_source := 'Section / ' || gen_random_uuid()::text;
  insert into public.crm_sections(source, owner_id) values(new_source, auth.uid());
  insert into public.crm_page_labels(source, name) values(new_source, btrim(section_name));
  return new_source;
end $$;
revoke all on function public.crm_create_section(text) from public;
grant execute on function public.crm_create_section(text) to authenticated;

create or replace function public.crm_access_context() returns jsonb
language sql stable security definer set search_path = public
as $$ select jsonb_build_object(
  'is_admin', public.crm_is_admin(),
  'personal_source', public.crm_personal_source(),
  'sources', coalesce((select jsonb_agg(source order by source) from (
    select source from public.crm_page_members where email = lower(auth.jwt()->>'email')
    union select public.crm_personal_source() where auth.uid() is not null
    union select source from public.crm_sections where owner_id = auth.uid() or public.crm_is_admin()
  ) allowed), '[]'::jsonb)
) $$;
-- Owners can delete custom sections or clear their personal workspace.
-- Administrators can also delete existing source sections.
create or replace function public.crm_delete_section(page_source text) returns void
language plpgsql security definer set search_path = public
as $$ declare section_owner uuid; begin
  select owner_id into section_owner from public.crm_sections where source = page_source for update;
  if auth.uid() is null or page_source is null or length(btrim(page_source)) = 0 or not (
    public.crm_is_admin()
    or page_source = public.crm_personal_source()
    or coalesce(section_owner = auth.uid(), false)
  ) then
    raise exception 'Only the section owner or an administrator can delete this section.';
  end if;
  delete from public.followups where lead_id in (select id from public.leads where source = page_source);
  delete from public.leads where source = page_source;
  delete from public.crm_import_rows where source = page_source;
  -- Personal workspaces remain available, with their title and sharing intact.
  if page_source like 'Personal leads / %' then return; end if;
  delete from public.crm_page_members where source = page_source;
  delete from public.crm_page_labels where source = page_source;
  delete from public.crm_sections where source = page_source;
end $$;
revoke all on function public.crm_delete_section(text) from public;
grant execute on function public.crm_delete_section(text) to authenticated;

notify pgrst, 'reload schema';
commit;
`````````````````````````````````````````````                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     