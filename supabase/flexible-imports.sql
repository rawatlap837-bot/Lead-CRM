-- Run once in Supabase SQL Editor after page-access.sql.
create table if not exists public.crm_import_rows (
 id uuid primary key default gen_random_uuid(),
 source text not null check(length(btrim(source)) between 1 and 200),
 file_name text not null default '',
 fields jsonb not null check(jsonb_typeof(fields)='object'),
 created_at timestamptz not null default now()
);
alter table public.crm_import_rows enable row level security;
revoke all on public.crm_import_rows from anon;
grant select,insert,update,delete on public.crm_import_rows to authenticated;
drop policy if exists "Manage shared page file data" on public.crm_import_rows;
create policy "Manage shared page file data" on public.crm_import_rows for all to authenticated
 using(public.crm_can_manage_source(source)) with check(public.crm_can_manage_source(source));
create index if not exists crm_import_rows_source_idx on public.crm_import_rows(source);
notify pgrst,'reload schema';
