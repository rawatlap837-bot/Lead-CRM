# Supabase login setup

The CRM uses your real Supabase database. There is no local mode and no registration page.

## 1. Create your CRM account

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select the same project used by this app.
2. Open **Authentication → Users**.
3. Choose **Add user → Create new user** (the dashboard may label this **New user**).
4. Enter your email and choose a password in Supabase.
5. Enable **Auto Confirm User**, then create the user. If you instead use an invitation, complete the invitation and password setup before signing in.
6. Your account should now appear in the Users list.

An account used to sign in to Supabase Dashboard is separate from a user in your project's Authentication list. Only a project Auth user can sign in to this CRM. Keep passwords out of chat and source code.

## 2. Check authentication settings

Under Authentication's sign-in/provider settings, ensure **Email** sign-in is enabled. For this admin-provisioned workspace, disable **Allow new users to sign up** if it is enabled. Existing users can still sign in. This keeps a shared workspace restricted to users you create.

Under **Authentication → URL Configuration**, set the development Site URL to `http://127.0.0.1:5174` if that is your running port. The Site URL does not affect ordinary password login; it matters for invitation, recovery and confirmation links. Use your deployed domain for production and explicitly list any development redirect URLs you need.

## 3. Check this app's environment

`.env` must contain the project base URL and its frontend anon key:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PROJECT_ANON_KEY
```

Use credentials from the same project. Do not append `/rest/v1/` to the URL. The client also handles that mistake by normalizing REST/auth endpoint URLs. Restart `npm run dev` after changing `.env`.

Run `npm run check:supabase` to verify the endpoint and email provider without printing your key or reading CRM data.

## 4. Sign in and verify real data

1. Open `http://127.0.0.1:5174/login` (or the terminal's actual port).
2. Enter the project Auth user's email and password.
3. Add one lead, refresh, and check that the same lead appears in Supabase **Table Editor → leads**.
4. Add a follow-up and check **followups**. Try an inline status change and a report export.

## 5. Check existing RLS policies if data operations fail

In Table Editor, open **leads → RLS policies**, then **followups → RLS policies**. Keep RLS enabled. For the supplied shared-workspace design, your approved `authenticated` users need SELECT, INSERT, UPDATE and DELETE permission on both tables. An UPDATE also needs a SELECT policy. Table grants and policies both need to allow the operation.

Use this read-only query in Supabase SQL Editor to inspect current configuration before changing it:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('leads', 'followups')
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('leads', 'followups')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

No policy changes are run by this project. If policies are missing, share the policy output (no passwords or keys) so the correct change can be prepared without replacing existing restrictions. The supplied tables have no ownership column, so account-level isolation would require a separate schema change.

## Common errors

- **Invalid login credentials**: The user does not exist in this project, or the email/password is wrong.
- **Email not confirmed**: Confirm this project's user or complete their confirmation/invitation.
- **Invalid path specified in request URL**: Use the project base URL and restart Vite.
- **Invalid API key**: Replace the frontend anon key with the one from the same project.
- **New row violates row-level security policy / permission denied**: Inspect table grants and policies above.
- **Login works but lists are empty**: There may be no records, or the SELECT policy filters them out.

Sources: [Supabase users](https://supabase.com/docs/guides/auth/users), [password authentication](https://supabase.com/docs/guides/auth/passwords), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
