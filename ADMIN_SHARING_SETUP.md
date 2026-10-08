# Activate the admin panel

1. Publish this CRM at a public HTTPS address.
2. Run supabase/page-access.sql in Supabase SQL Editor. It replaces broad lead/follow-up policies with access to shared sources and preserves existing records.
3. Replace REPLACE_WITH_ADMIN_EMAIL in supabase/admin-bootstrap.sql with your administrator account email, then run it. The account must exist in Authentication → Users.
4. Deploy bright-action using supabase/page-invite-dashboard.txt in the Edge Function editor. Disable Verify JWT: the handler validates the session and administrator role itself.
5. Set Edge Function secret CRM_APP_URL to the public CRM address. Keep CRM_DATABASE_KEY as your server-only service role key. Never expose this database key in Apps Script or browser code.
6. In Authentication URL Configuration set Site URL to the CRM address and allow its redirects, for example https://your-crm.example/**.
7. Configure custom SMTP for emails to external recipients. Default Supabase email only supports project-team addresses: https://supabase.com/docs/guides/auth/auth-smtp.
8. Sign in again. Open Lead connections. Enter an email on a landing-page card and click Send invitation. A page appears after its first lead arrives. Members can manage leads, follow-ups and exports only for shared sources. Existing users can request an email sign-in link at Login.
9. Remove access revokes the page in the database. Refresh the recipient screen to clear previously displayed information.

Test using a second account: share one page, confirm other pages cannot be accessed, edit a lead and follow-up, revoke access and verify denial. Production activation is incomplete until these checks pass.

Keep Sheet source names consistent. Email delivery failure is reported separately: page access is still granted. Until the SQL and administrator bootstrap are installed, the CRM blocks access with Workspace access required.

## Flexible file uploads
Run supabase/flexible-imports.sql once in SQL Editor. Redeploy the CRM. Excel/CSV uploads preserve every nonblank row, including the first, under Column 1, Column 2, etc. No name or phone is required. Open the page tab and scroll to Uploaded file data to edit any row. This data uses page access policies and does not invent contact details. Existing Google Sheet lead sync is unchanged. Redeploy bright-action with the updated page-invite-dashboard.txt to share pages containing only file rows.
