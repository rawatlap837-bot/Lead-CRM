# Enable normal users to add leads and import Excel

The frontend now shows **Add lead** and **Import Excel** to signed-in normal users. Their default destination is **My leads**, a personal source derived from their Supabase user ID. They can also choose pages explicitly shared with them.

## One-time database update

1. In Supabase SQL Editor, confirm `supabase/page-access.sql` and `supabase/flexible-imports.sql` have already been installed.
2. Open `supabase/personal-workspaces.sql` from this project, copy the whole file into SQL Editor, and run it.
3. Refresh the CRM. Normal users can save in **My leads** immediately; no administrator role or invitation is needed for their own source.

The SQL file has been prepared locally, not applied to the connected production database. Before it is installed, the buttons appear but personal saves will report that workspace setup is required.

## Access rules

- Normal users can manage their own personal source and explicitly shared pages.
- Existing page permissions remain in place. Choosing a different source in a modified browser request does not grant permission.
- Administrators retain their existing access to all sources.
- Follow-ups and uploaded rows inherit the source access checks through the existing policies.
- Sharing remains administrator-only. Personal sources are not automatically shared with other normal users.

After applying the update, verify with two normal accounts: create a lead and import a small file in the first account, then confirm the second account cannot see either. Check an administrator can still see the new records and that shared pages remain available. Automated UI tests use a local API fixture; production database policy enforcement needs this live check.

Run this migration last if reinstalling `page-access.sql`, since that older setup file replaces the same permission functions.
