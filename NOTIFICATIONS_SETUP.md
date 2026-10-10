# CRM activity notifications

Notifications are part of the existing CRM. The bell is in the desktop header and mobile header. Unread badges appear beside Dashboard, Leads, Follow-ups, Reports, and Lead connections when those sections have updates. An unread banner opens updates filtered to the current section.

## Activate once

1. Confirm the earlier migrations are installed: `page-access.sql`, `flexible-imports.sql`, `personal-workspaces.sql`, and `page-names.sql`.
2. Run the complete `supabase/activity-notifications.sql` file in Supabase SQL Editor.
3. Refresh the CRM and create a test lead. Its notification should appear within 15 seconds while the app is visible, or when returning focus to the window.

The migration was tested in disposable PostgreSQL but has not been run on your production Supabase project. It is repeatable and installs triggers without duplicating them.

## What produces updates

| Activity | Sections notified |
| --- | --- |
| Lead added, edited, status changed, moved, or deleted | Dashboard, Leads, Reports |
| Excel/CSV file rows imported, edited, or deleted | Dashboard, Leads, Reports |
| Follow-up scheduled, updated, completed, or removed | Dashboard, Follow-ups |
| Page title changed or reset | Dashboard, Leads, Lead connections |
| Page access shared or removed | Recipient and administrator: Dashboard, Leads, Lead connections |

Notifications record future changes, including changes from server integrations and Sheets. Existing records are not backfilled. Bulk spreadsheet imports generate one event per source per database statement instead of one notification per row. Rescheduling can create multiple events because it saves a new follow-up and completes the previous one.

## Reading and access

- The panel shows the latest 100 accessible events. Badges count unread events within that recent window.
- Use **View updates** on a section banner to open its updates and mark those updates read. In the bell, filter by section or use **Mark read** on individual updates and **Mark all read** across all sections.
- Read status is stored in Supabase separately for each account and survives refreshes and device changes.
- Merely navigating to a section does not mark its events read; opening its unread banner does.
- Normal users see activity for their own and explicitly shared sources. Administrators see all activity. Removed members retain their own sharing/removal notices but lose access to general activity from that page.
- Permission checks run in the database. Browser clients cannot insert or edit activity records.
- Updates refresh every 15 seconds while the page is visible and when the app regains focus or reconnects.

## Editing the implementation

- `src/lib/activity.js`: queries, read acknowledgements, section mapping, destination links.
- `src/lib/useActivity.js`: polling and account-specific state.
- `src/components/ActivityNotifications.jsx`: bell, panel, section filters, read buttons.
- `src/components/Sidebar.jsx`: header bells, navigation badges, section banner.
- `supabase/activity-notifications.sql`: event triggers and access policies.
- `tests/activity-database.test.js`: actual PostgreSQL trigger and permission tests using the development-only PGlite dependency.

Run `npm test` after changes. These tests use disposable local data, never your live Supabase database.
