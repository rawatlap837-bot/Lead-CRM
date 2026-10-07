# Real lead connection

Implemented locally; database migrations and functions have not been deployed. Existing contacts are not automatically imported by a Pixel. This CRM contains lead receivers and a small website API template, not a copy of the LMS website. Existing Sheet records remain untouched.

## 1. Supabase

Run `supabase/integrations.sql` in the same project's SQL Editor. Existing CRM `leads` table must have a unique constraint on `phone`, and authenticated users must have the existing shared-workspace read policy. Incoming leads use that shared workspace.

Install/login to Supabase CLI, link this directory to your project, and deploy:

```sh
supabase functions deploy lead-ingest
supabase functions deploy meta-leads
```

In the project's Edge Function secrets panel set `CRM_DATABASE_KEY` to the project's legacy **service_role** key, and `LEAD_INGEST_SECRET` to a newly generated random secret of at least 32 characters. `SUPABASE_URL` is automatically supplied. Never put either secret in VITE_ or NEXT_PUBLIC_ variables, GitHub, the Pixel editor, or chat. The server functions authenticate website requests and Meta signatures themselves; their JWT gateway is disabled for that reason.

## 2. Website (creative-crew98/lms-page)

In your separate LMS website repository, install the small API route template from `integrations/nextjs/app/api/crm-lead/route.js`. Configure private environment variables:

- `CRM_LEAD_RECEIVER_URL`: your project's `/functions/v1/lead-ingest` URL, shown under Lead connections.
- `CRM_LEAD_INGEST_SECRET`: the same server secret as above.

Connect the website's existing submit handler to `/api/crm-lead` with `{ name, phone, email, answers }`. Report success and track a Lead only after the CRM confirms the save. This change must be made in the separate website repository; the CRM cannot capture contact details from Pixel events alone. The API requires the browser's same-origin request. Configure your hosting provider's rate limiting for this public route before accepting production traffic; same-origin checking does not prevent automated spam. Keep your existing consent/privacy requirements.

Pasted Pixel code is never executed: only its ID is extracted and stored as connection metadata. Your website can optionally read its saved Pixel ID from the receiver's GET endpoint with `?connection_id=YOUR_CONNECTION_ID`; only the numeric Pixel ID is returned. This optional tracking configuration requires implementation in your separate website repository. Saving a Pixel in CRM does not itself modify the website or subscribe to Meta leads.

## 3. Meta Lead Ads

Create/configure a Meta developer app associated with your business/Page and obtain a Page access token with lead retrieval access, including `leads_retrieval` and applicable Page subscription permissions. Assign lead access to the app/system user in Business settings. Use Meta's current app dashboard to determine required review, business verification, and production access for your account.

Set these Edge Function secrets:

- `META_APP_SECRET`: App Secret used to verify raw webhook HMAC SHA-256 signatures.
- `META_VERIFY_TOKEN`: your own random verification token.
- `META_PAGE_ID`: the Page whose leads this CRM should accept.
- `META_PAGE_ACCESS_TOKEN`: server-only Page access token; monitor expiry and renew it.
- `META_GRAPH_VERSION`: a supported version in your Meta app, in `vNN.N` format.

In Meta's **Page** webhooks configure callback `https://YOUR_PROJECT.supabase.co/functions/v1/meta-leads`, verification token above, and subscribe to `leadgen`. Also subscribe your app to the actual Page's `leadgen` field through the Page `subscribed_apps` endpoint. The callback fetches `field_data` for each lead notification with the Page token; Pixel IDs do not grant this access.

Require **full name and phone number** on instant forms because the CRM needs both; email is optional. Additional fields are stored as answers with Meta lead/form IDs. Only the configured Page is processed. Missing required contacts or expired tokens cause an error, so monitor function failures and recover missed leads from the Meta API. This initial receiver processes notifications synchronously; large traffic needs a durable queue. Historic Meta or Google Sheet leads require a separate authorized import; deployment does not backfill them.

## 4. Verify with your accounts

Use Check receiver configuration, then submit your own website form and verify the real contact and answers in Leads. Use Meta's Lead Ads Testing Tool on your Page/form and verify the Meta Lead Ads source. Check Supabase function logs for errors without logging contact payloads. Lists/dashboard refresh within approximately 15 seconds when the tab is visible and no form is open.

Repeated delivery of the same phone is acknowledged without overwriting its current CRM status. Country codes/phone formatting must be consistent across sources. A contact already present will not become a second lead. Receiver health only confirms configured secrets, not database permissions, Meta permissions, website deployment, or successful delivery.

References: [Supabase function authentication](https://supabase.com/docs/guides/functions/auth), [Supabase secrets](https://supabase.com/docs/guides/functions/secrets), [Meta's lead retrieval setup guide](https://github.com/facebookincubator/catalogue-of-api-solutions/blob/main/solutions/leads/leads-retrieval-set-up-checker.md).

