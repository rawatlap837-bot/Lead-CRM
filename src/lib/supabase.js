import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "./config";
let url = "";
let configError = "";
try {
  url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
} catch {
  configError =
    "The Supabase URL is invalid. Use your project base URL, such as https://your-project.supabase.co.";
}
export { configError };
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isConfigured = Boolean(url && key);
const previous = import.meta.hot?.data.client;
export const supabase = isConfigured
  ? previous?.url === url && previous?.key === key
    ? previous.client
    : createClient(url, key)
  : null;
if (import.meta.hot) import.meta.hot.data.client = { url, key, client: supabase };
