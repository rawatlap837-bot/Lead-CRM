-- Add only integration metadata; existing leads/followups are not recreated.
begin;
create table if not exists public.crm_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  pixel_id text not null check (pixel_id ~ '^[0-9]{5,30}$'),
  website_url text not null default '',
  created_at timestamptz not null default now(),
  unique(user_id, pixel_id)
);
alter table public.crm_integrations enable row level security;
revoke all on public.crm_integrations from anon;
grant select, insert, update, delete on public.crm_integrations to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_integrations' and policyname='Manage own CRM integration metadata') then
    create policy "Manage own CRM integration metadata" on public.crm_integrations
      for all to authenticated using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
