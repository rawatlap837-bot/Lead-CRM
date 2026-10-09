-- Customize display names without changing Sheet source names or sharing permissions.
create table if not exists public.crm_page_labels (
 source text primary key,
 name text not null check(length(btrim(name)) between 1 and 200)
);
alter table public.crm_page_labels enable row level security;
revoke all on public.crm_page_labels from anon;
grant select,insert,update,delete on public.crm_page_labels to authenticated;
drop policy if exists "Read allowed page names" on public.crm_page_labels;
create policy "Read allowed page names" on public.crm_page_labels for select to authenticated using(public.crm_can_manage_source(source));
drop policy if exists "Admin changes page names" on public.crm_page_labels;
-- Admins and members can rename only the sources they can manage.
drop policy if exists "Managers add page names" on public.crm_page_labels;
create policy "Managers add page names" on public.crm_page_labels
 for insert to authenticated with check(public.crm_can_manage_source(source));
drop policy if exists "Managers update page names" on public.crm_page_labels;
create policy "Managers update page names" on public.crm_page_labels
 for update to authenticated using(public.crm_can_manage_source(source))
 with check(public.crm_can_manage_source(source));
drop policy if exists "Admin deletes page names" on public.crm_page_labels;
create policy "Admin deletes page names" on public.crm_page_labels
 for delete to authenticated using(public.crm_is_admin());
notify pgrst,'reload schema';
