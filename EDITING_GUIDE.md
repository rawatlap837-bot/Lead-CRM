# Editing Creative crew CRM

This is a React app written in JavaScript. Edit the source files below; Vite creates the production files in `dist/` for you.

## Start and verify

```sh
npm install
npm run dev
```

The local address appears in the terminal. Save a source file to see the change in the browser.

After editing:

```sh
npm run format
npm run format:check
npm test
npm run build
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm`. If the restricted Windows environment blocks Vite's config bundler, build with `npm.cmd run build -- --configLoader runner`.

## Find the file you need

| Change | File |
| --- | --- |
| Logo and brand name in the app | `Brand` in `src/components/Sidebar.jsx` |
| Original logo image | `public/cc.webp` |
| Browser title, favicon, and description | `index.html` |
| Colors, buttons, cards, mobile layouts | `src/index.css` |
| Font stack and Tailwind theme | `tailwind.config.js` |
| Navigation links and mobile menu | `src/components/Sidebar.jsx` |
| Notification bell, filters, and read actions | `src/components/ActivityNotifications.jsx` |
| Notification polling and database queries | `src/lib/useActivity.js`, `src/lib/activity.js` |
| Routes and page loading | `src/App.jsx` |
| Login screen and login actions | `src/pages/Login.jsx` |
| Password recovery screen | `src/pages/ResetPassword.jsx` |
| Dashboard and overview cards | `src/pages/Dashboard.jsx`, `src/components/StatCard.jsx` |
| Lead list, search, filters, pagination | `src/pages/Leads.jsx` |
| Named lead sections | `src/components/NewSection.jsx`, `src/lib/sections.js` |
| Compact mobile uploaded rows | `src/components/CompactRecord.jsx` |
| Lead details and follow-up history | `src/pages/LeadDetail.jsx` |
| Lead and follow-up form fields | `src/components/Forms.jsx` |
| Form validation rules | `src/lib/validation.js` |
| Follow-up list | `src/pages/FollowUps.jsx` |
| Report screen and period filters | `src/pages/Reports.jsx` |
| PDF and Excel exports | `src/lib/exportPdf.js`, `src/lib/exportExcel.js` |
| Landing page connections | `src/pages/Integrations.jsx` |
| Page sharing and invitations | `src/components/PageSharing.jsx`, `src/lib/page-access.js` |
| Page display names | `src/components/PageName.jsx`, `src/lib/pageNames.js` |
| Spreadsheet upload screen | `src/components/ImportLeads.jsx` |
| Uploaded rows and row editing | `src/components/FileData.jsx` |
| Uploaded-row database queries | `src/lib/flexibleImports.js` |
| Google Sheets sync script | `google-sheets-sync.gs` |

## How data reaches the screen

1. `src/main.jsx` starts React and loads the shared CSS.
2. `src/App.jsx` mounts authentication, notifications, and routes.
3. `src/context/AuthContext.jsx` reads the Supabase session and page permissions. `auth-state.js` exports the context and `useAuth()` hook.
4. `ProtectedRoute.jsx` requires a session and successful permission loading before showing the workspace.
5. A page calls helpers in `src/lib/`. `useLoad.js` handles loading, errors, retries, and discarding old responses. `useAutoRefresh.js` refreshes visible pages while preserving open forms.
6. Supabase enforces access through database policies. Hiding a button in React does not change database permissions.

For example, to add a lead field, update the form in `Forms.jsx`, the rules in `validation.js`, and the relevant save/export helpers. Confirm the database column exists before sending it. A UI label change alone does not require changing the stored field name.

## Keep these distinctions

- A page's `source` is its stable identifier for Sheets and sharing. Use the rename feature to change its display name.
- `leads` contains structured contacts. `crm_import_rows` preserves arbitrary spreadsheet rows. They use separate helpers and screens.
- Dates use `Asia/Kolkata` in `src/lib/dates.js`. Reuse those helpers for filters and follow-up dates.
- Components use `busy` state for saving indicators. Some use a `pending` ref too, which blocks rapid duplicate submissions before React renders again.
- `useLoad` dependencies identify the data being requested. Include a changing record ID or filter in that dependency list when creating a new loader.

## Server-side code

`supabase/functions/` contains handlers for invitations, website leads, and Meta leads. Each `index.js` starts its handler; the adjacent `handler.js` contains the request logic and can be tested with injected dependencies.

`supabase/*.sql` contains database setup and permission policies. These files run through Supabase SQL Editor, not automatically with the frontend build. Review migrations separately from UI edits.

`supabase/*-dashboard.txt` are standalone deployment copies for pasting into Supabase. If changing the matching handler, review and update its deployment copy as well. Deploying just the frontend does not deploy an Edge Function or update an installed Apps Script.

`integrations/nextjs/` is an example receiver for a separate Next.js site. It is not part of the Vite app's routes.

## Configuration and release

- `.env` holds the local public Supabase URL and browser key. It is ignored by Git.
- `.prettierrc.json` defines consistent formatting. `npm run format` covers application code, functions, tests, config, and the Sheets script.
- Do not edit generated files in `dist/`, installed packages in `node_modules/`, or `package-lock.json` by hand.
- Keep private database keys and provider secrets in server configuration. Anything prefixed `VITE_` can be bundled into the browser.
- Read `LAUNCH_CHECKLIST.md` before publishing. The authentication and integration setup documents explain their external settings.
