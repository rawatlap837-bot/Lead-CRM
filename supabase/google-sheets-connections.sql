-- Install after page-access.sql and personal-workspaces.sql.
-- Stores only a SHA-256 digest of each user's Google Sheets connector token.
begin;

-- gen_random_uuid() is available in supported Supabase Postgres versions.
-- SHA-256 uses PostgreSQL's built-in sha256(bytea) function.

create table if not exists public.crm_sheet_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.crm_sheet_connections enable row level security;
revoke all on public.crm_sheet_connections from public, anon, authenticated;

create or replace function public.crm_rotate_sheet_connection()
returns text language plpgsql security definer set search_path = public
as $$
declare
  raw_token text;
  digest text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  raw_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  digest := encode(sha256(convert_to(raw_token, 'UTF8')), 'hex');
  insert into public.crm_sheet_connections(user_id, token_hash)
  values (auth.uid(), digest)
  on conflict (user_id) do update
    set token_hash = excluded.token_hash, updated_at = now();
  return raw_token;
end;
$$;
revoke all on function public.crm_rotate_sheet_connection() from public, anon;
grant execute on function public.crm_rotate_sheet_connection() to authenticated;

create or replace function public.crm_sheet_connection_owner(token_hash text)
returns uuid language sql security definer set search_path = public
as $$
  select c.user_id from public.crm_sheet_connections c
  where c.token_hash = $1
$$;
revoke all on function public.crm_sheet_connection_owner(text) from public, anon, authenticated;
grant execute on function public.crm_sheet_connection_owner(text) to service_role;

notify pgrst, 'reload schema';
commit;
