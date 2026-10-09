# Activate Google sign-in

The Continue with Google button is installed. These provider settings must be saved externally.

1. In Google Cloud Console create/select a project. Open Google Auth Platform and configure Branding and Audience for the CRM. Add test users if the app is in Testing mode.
2. Create an OAuth client with type Web application.
3. Add authorized JavaScript origin https://crm.creativecrew.com.co (no trailing slash).
4. Add authorized redirect URI https://adcynatgsnvwkadinumf.supabase.co/auth/v1/callback . This is the Supabase callback, not the CRM website URL.
5. In Supabase Authentication → Sign In / Providers → Google enable the provider and paste the Google Client ID and Client Secret. Save. Keep the Client Secret in Supabase, not .env browser variables or chat.
6. In Supabase URL Configuration keep Site URL https://crm.creativecrew.com.co/ and allow https://crm.creativecrew.com.co/**. For local tests also allow http://127.0.0.1:5173/**.
7. Redeploy the CRM and click Continue with Google. Use crewcreative98@gmail.com for the administrator, or an email shared with a landing page. Signing in with another Google account does not grant CRM access.

Official guide: https://supabase.com/docs/guides/auth/social-login/auth-google

For display-name customization, run supabase/page-names.sql once. In Lead connections click Rename page on its card. Sheet source names remain unchanged so future lead delivery and invitations stay linked to the correct page.
