-- Run after page-access.sql, personal-workspaces.sql, flexible-imports.sql,
-- and page-names.sql. Records future activity; existing data is not backfilled.
begin;

create table if not exists public.crm_activity (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  section text not null check (section in ('leads', 'followups', 'integrations')),
  message text not null,
  entity_id text,
  recipient_email text,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists crm_activity_recent on public.crm_activity(created_at desc, id);
create index if not exists crm_activity_source on public.crm_activity(source);

create table if not exists public.crm_activity_reads (
  event_id uuid not null references public.crm_activity(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.crm_activity enable row level security;
alter table public.crm_activity_reads enable row level security;
revoke all on public.crm_activity, public.crm_activity_reads from anon, authenticated;
grant select on public.crm_activity to authenticated;
grant select, insert on public.crm_activity_reads to authenticated;

drop policy if exists "Read accessible activity" on public.crm_activity;
create policy "Read accessible activity" on public.crm_activity for select to authenticated
using (
  public.crm_is_admin()
  or (recipient_email is not null and recipient_email = lower(auth.jwt()->>'email'))
  or (recipient_email is null and public.crm_can_manage_source(source))
);
drop policy if exists "Read own acknowledgements" on public.crm_activity_reads;
create policy "Read own acknowledgements" on public.crm_activity_reads
for select to authenticated using (user_id = auth.uid());
drop policy if exists "Acknowledge accessible activity" on public.crm_activity_reads;
create policy "Acknowledge accessible activity" on public.crm_activity_reads
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.crm_activity where id = event_id
  )
);

-- Only database triggers write events. Browser clients cannot forge activity.
create or replace function public.crm_record_activity() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  item jsonb;
  previous jsonb;
  page_source text;
  activity_section text;
  activity_message text;
  target_id text;
  recipient text;
begin
  if TG_OP = 'DELETE' then item := to_jsonb(OLD);
  else item := to_jsonb(NEW); end if;
  if TG_OP = 'UPDATE' then
    previous := to_jsonb(OLD);
    if item = previous then return NEW; end if;
  end if;
  page_source := item->>'source';
  target_id := item->>'id';
  if TG_TABLE_NAME = 'leads' then
    if TG_OP = 'DELETE' then target_id := null; end if;
    activity_section := 'leads';
    activity_message := case TG_OP
      when 'INSERT' then 'New lead added'
      when 'DELETE' then 'Lead deleted'
      else case when item->>'status' is distinct from previous->>'status'
        then 'Lead status changed to ' || coalesce(item->>'status', 'unknown')
        else 'Lead details updated' end end;
  elsif TG_TABLE_NAME = 'followups' then
    select source into page_source from public.leads
      where id::text = item->>'lead_id';
    target_id := item->>'lead_id';
    activity_section := 'followups';
    activity_message := case TG_OP
      when 'INSERT' then 'Follow-up scheduled'
      when 'DELETE' then 'Follow-up removed'
      else case when item->>'status' = 'done' then 'Follow-up completed'
        else 'Follow-up updated' end end;
  elsif TG_TABLE_NAME = 'crm_page_labels' then
    target_id := null;
    activity_section := 'integrations';
    activity_message := case when TG_OP = 'DELETE' then 'Page title reset'
      else 'Page renamed to ' || (item->>'name') end;
  elsif TG_TABLE_NAME = 'crm_page_members' then
    target_id := null;
    recipient := item->>'email';
    activity_section := 'integrations';
    activity_message := case when TG_OP = 'DELETE' then 'Page access removed'
      else 'Page access shared' end;
  end if;
  if page_source is not null and activity_section is not null then
    insert into public.crm_activity(source, section, message, entity_id, recipient_email, actor_id)
    values (page_source, activity_section, activity_message, target_id, recipient, auth.uid());
    if TG_TABLE_NAME = 'leads' and TG_OP = 'UPDATE'
       and previous->>'source' is distinct from page_source
       and previous->>'source' is not null then
      insert into public.crm_activity(source, section, message, actor_id)
      values (previous->>'source', 'leads', 'Lead moved to another page', auth.uid());
    end if;
  end if;
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;
revoke all on function public.crm_record_activity() from public;

do $$ declare table_name text; begin
  foreach table_name in array array['leads', 'followups', 'crm_page_labels', 'crm_page_members'] loop
    execute format('drop trigger if exists crm_activity_change on public.%I', table_name);
    execute format('create trigger crm_activity_change after insert or update or delete on public.%I for each row execute function public.crm_record_activity()', table_name);
  end loop;
end $$;

-- One event per file/source per statement, rather than one notification per row.
create or replace function public.crm_record_import_activity() returns trigger
language plpgsql security definer set search_path = public
as $$ begin
  if TG_OP = 'INSERT' then
    insert into public.crm_activity(source, section, message, actor_id)
    select source, 'leads', count(*)::text || ' file rows imported', auth.uid()
    from new_rows group by source;
  elsif TG_OP = 'UPDATE' then
    insert into public.crm_activity(source, section, message, actor_id)
    select n.source, 'leads', count(*)::text || ' uploaded rows updated', auth.uid()
    from new_rows n join old_rows o on n.id = o.id
    where to_jsonb(n) is distinct from to_jsonb(o) group by n.source;
  else
    insert into public.crm_activity(source, section, message, actor_id)
    select source, 'leads', count(*)::text || ' uploaded rows deleted', auth.uid()
    from old_rows group by source;
  end if;
  return null;
end $$;
revoke all on function public.crm_record_import_activity() from public;
drop trigger if exists crm_activity_import_insert on public.crm_import_rows;
create trigger crm_activity_import_insert after insert on public.crm_import_rows
referencing new table as new_rows for each statement execute function public.crm_record_import_activity();
drop trigger if exists crm_activity_import_update on public.crm_import_rows;
create trigger crm_activity_import_update after update on public.crm_import_rows
referencing new table as new_rows old table as old_rows for each statement execute function public.crm_record_import_activity();
drop trigger if exists crm_activity_import_delete on public.crm_import_rows;
create trigger crm_activity_import_delete after delete on public.crm_import_rows
referencing old table as old_rows for each statement execute function public.crm_record_import_activity();

notify pgrst, 'reload schema';
commit;
