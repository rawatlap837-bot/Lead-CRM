-- Replace the email with the administrator's existing Supabase Auth email.
-- Run only from SQL Editor, never from a browser client.
do $$
declare admin_id uuid;
begin
 select id into admin_id from auth.users where lower(email)=lower('crewcreative98@gmail.com');
 if admin_id is null then raise exception 'Administrator email not found in Authentication → Users.'; end if;
 insert into public.crm_admins(user_id) values(admin_id) on conflict do nothing;
end $$;
