# Creative crew launch review

## Verified locally

- Automated tests cover login, route access, page sharing, lead forms, imports, follow-ups, reports, and offline feedback.
- Production bundle builds using `npm run build -- --configLoader runner` (the runner avoids a config-bundling filesystem restriction in this Windows environment).
- Supabase Auth responds; email, Google, and public signup are enabled. This checks provider configuration, not completion of OAuth or email delivery.
- New users enter an empty workspace without receiving administrator permissions. They can add leads and import Excel into My leads after the personal workspace SQL update below is installed.

## Before publishing

1. Confirm the database has the policies in `supabase/page-access.sql` and the intended administrator from `supabase/admin-bootstrap.sql`. The access-context RPC must be installed. Review existing policies before applying SQL to production.
2. If using file uploads and page renaming, confirm `supabase/flexible-imports.sql` and `supabase/page-names.sql` are installed.
   Run `supabase/personal-workspaces.sql` after page-access and flexible-imports to allow normal users to save their own leads and uploads. The frontend buttons alone cannot grant database permission. Re-run this migration last if reinstalling page-access.sql later.
3. Configure Vercel with the Vite preset, build command `npm run build`, and output directory `dist`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the production environment. Only the public browser key belongs in these variables.
4. Confirm Supabase Site URL and allowed redirect URLs use the production domain, including `/reset-password`. Follow `GOOGLE_LOGIN_SETUP.md` for the Google provider and callback configuration.
5. Deploy the Supabase receiver and page-invite functions if using automatic lead delivery or invitations. Follow `LEAD_CONNECTION_SETUP.md` and `ADMIN_SHARING_SETUP.md` for server configuration.

## Test on the production domain before inviting customers

- Sign in with Google and with email/password. Complete password recovery using a test account.
- Sign in with a new account: confirm zero existing leads and no admin controls. Share one test page and sign in again; confirm only that page's data is visible.
- Add a disposable lead, edit its status, schedule and complete a follow-up, and export a report. Check totals and source tabs update after saving.
- Import a small disposable file and verify its rows. If using Sheets, submit one real test lead and verify delivery.
- Refresh `/leads` and `/reports` directly to check hosting rewrites.
- Inspect login, navigation, forms, and tables on desktop and mobile. Browser visual review was unavailable in this session; DOM tests do not verify rendered layout.

No production deployment, database migration, or live lead writes were performed in this session.

Official deployment references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) and [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
