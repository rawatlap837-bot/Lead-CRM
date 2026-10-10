# Google Sheets connections

Users can connect a Sheet to their own private CRM workspace without receiving Supabase database credentials. The CRM issues a random per-user token, stores only its SHA-256 digest, and the Edge Function writes rows using that user's token and personal-workspace RLS policy.

## Supabase setup (administrator, once)

1. Run `supabase/google-sheets-connections.sql` after `page-access.sql` and `personal-workspaces.sql` in the Supabase SQL Editor.
2. Deploy `supabase/functions/lead-ingest/` as the `lead-ingest` Edge Function. Keep JWT verification disabled for this function; the handler validates tokens itself.
3. Set Edge Function secrets:
   - `CRM_DATABASE_KEY`: service-role key, used only by the server to look up the owner of a hashed Sheet token. Never put this in the browser or Apps Script.
   - `LEAD_INGEST_SECRET`: at least 32 random characters, retained for existing server-to-server landing-page integrations.
4. Set `VITE_SUPABASE_URL` to the project base URL and `VITE_SUPABASE_ANON_KEY` to the project's anon key when building the CRM.

The endpoint is `/functions/v1/lead-ingest/sheet`. Each Sheet also gets a separate random, revocable per-user token. The Edge Function uses the service-role key to resolve that token and insert the lead after deriving the owner's personal workspace. Sheet-provided source/account IDs are ignored. The random connector token is not a Supabase JWT; it is validated by the Edge Function and must never be used as a database bearer token.

## Connect a Sheet (each user)

1. Sign in to the CRM and open **Lead connections**.
2. Click **Create secure connection** once. Paste the Google Sheet URL, enter the exact tab name, add a page label, and click **Prepare connection**.
3. Copy the generated connector code. In Google Sheets, open **Extensions → Apps Script**. Add a separate script file named **CRM Sync**, paste the connector code there, and save. Keep any existing form scripts; do not replace them.
4. Select `setupMyCrmSheet` in Apps Script and click **Run**. Approve Google's access prompt.
5. New rows are checked about every minute. Check the `CRM delivery` column; reload the Sheet and choose **CRM sync → Sync now** to run immediately.

Each row needs a name and phone number. Include the country code in phone numbers. Email and other non-system columns are optional. Existing leads with matching phone numbers are treated as duplicates and are not overwritten. Keep the generated script private. Creating a new token revokes the previous one; update every connected Sheet script afterward.

For a non-technical walkthrough and troubleshooting steps, see [GOOGLE_SHEETS_USER_GUIDE.md](GOOGLE_SHEETS_USER_GUIDE.md).

## Existing server integrations

The original `/functions/v1/lead-ingest` endpoint remains available for trusted landing-page servers and Meta webhook forwarding. It continues to require `LEAD_INGEST_SECRET` and uses the server-only `CRM_DATABASE_KEY`.
