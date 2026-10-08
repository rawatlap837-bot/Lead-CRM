# Connect existing Google Sheets leads to this CRM

The landing pages do not need to change. Add `google-sheets-sync.gs` to each existing landing-page spreadsheet's Apps Script project. The time-driven trigger reads rows from the configured sheet, sends up to ten per run to Supabase, marks each delivery in a `CRM delivery` column, and retries pending rows every five minutes. It maps common name, phone, and email headings; other non-system columns become lead answers. The `Leads` sheet is used by default.

## Deploy the CRM receiver

This workspace contains the deployable function under `supabase/functions/lead-ingest/`. The public health endpoint deliberately has `verify_jwt = false`; POST requests require the private `LEAD_INGEST_SECRET` bearer credential. The function writes validated rows to the existing `public.leads` table using a server-only database key. Configure Supabase function secrets `CRM_DATABASE_KEY` (service role key) and `LEAD_INGEST_SECRET` (at least 32 characters). Keep both out of the browser, Sheets, and landing pages.

The Supabase project dashboard/CLI is not authenticated in this workspace. Before deployment, the current receiver endpoint returned 404. Deploy `lead-ingest` from Supabase Edge Functions; then set its secrets and check receiver status in the CRM. No integration metadata migration or Pixel ID is required for Google Sheets lead capture.

## Connect one spreadsheet

Paste the code from `google-sheets-sync.gs` into that spreadsheet's existing Apps Script project. In **Project Settings ? Script properties**, add:

- `CRM_SOURCE_SHEET_ID`: spreadsheet ID from its URL.
- `CRM_SOURCE_SHEET_NAME`: lead-tab name, usually `Leads`.
- `CRM_LEAD_RECEIVER_URL`: CRM URL shown under Lead connections, ending in `/functions/v1/lead-ingest`.
- `CRM_LEAD_INGEST_SECRET`: same private value as Supabase `LEAD_INGEST_SECRET`.
- `CRM_LEAD_SOURCE`: a name for that landing page.

Select `installCrmSheetSync` in Apps Script and click Run once to approve the sheet and outbound HTTP permissions and install the five-minute trigger. It immediately attempts a sync. No edits to the landing page are needed. Repeat for each separate spreadsheet. If all pages already save to the same sheet, configure it only once.

Check the `CRM delivery` column. `Delivered to CRM` confirms the receiver accepted the lead; `Pending - ...` will be retried. Phone numbers must include a country code and seven to fifteen digits. Existing CRM phone matches are safely treated as duplicates rather than overwritten.

A Meta Pixel records browser events but cannot read a visitor's name, phone, email, or form answers. Meta instant forms require the separate signed `meta-leads` webhook and Meta Page permissions; the Pixel and Sheets connector do not import those ad forms.
