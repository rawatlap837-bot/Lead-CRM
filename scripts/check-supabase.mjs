import { loadEnv } from "vite";
import { normalizeSupabaseUrl } from "../src/lib/config.js";

try {
  const env = loadEnv("development", process.cwd(), "VITE_");
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL);
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env first.",
    );
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `Auth settings endpoint returned HTTP ${response.status}. Check the URL and frontend key are from the same project.`,
    );
  const settings = await response.json();
  console.log("Supabase Auth endpoint: reachable");
  console.log(
    `Email authentication: ${settings.external?.email ? "enabled" : "disabled"}`,
  );
  console.log(
    `Public signup: ${settings.disable_signup ? "disabled" : "enabled"}`,
  );
  console.log(
    `Email confirmation required: ${settings.mailer_autoconfirm ? "no" : "yes"}`,
  );
  console.log(
    "Next: create your project Auth user in Authentication > Users, then sign in to the CRM.",
  );
} catch (error) {
  console.error(`Supabase check failed: ${error.message}`);
  process.exitCode = 1;
}
