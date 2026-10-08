import { supabase } from './supabase';
export function parsePixelId(value) {
  const text = String(value || '').trim();
  if (/^\d{5,30}$/.test(text)) return text;
  const match = text.match(/(?:PIXEL_ID|LMS_PIXEL_ID)\s*=\s*["'](\d{5,30})["']/) || text.match(/fbq\(\s*["']init["']\s*,\s*["'](\d{5,30})["']/) || text.match(/[?&](?:amp;)?id=(\d{5,30})(?:&|["']|$)/);
  if (!match) throw new Error('Paste a numeric Pixel ID or Pixel code containing PIXEL_ID or fbq("init", "...").');
  return match[1];
}
export function receiverUrl() {
  return supabase
    ? `${supabase.supabaseUrl.replace(/\/$/, '')}/functions/v1/super-worker`
    : '';
}
export function sqlEditorUrl() {
  if (!supabase) return 'https://supabase.com/dashboard';
  const host = new URL(supabase.supabaseUrl).hostname;
  const match = host.match(/^([a-z0-9]+)\.supabase\.co$/);
  return match ? `https://supabase.com/dashboard/project/${match[1]}/sql/new` : 'https://supabase.com/dashboard';
}
export function connectionError(error) { return ['42P01', 'PGRST205'].includes(error.code) ? 'Integration storage is not installed yet. Run supabase/integrations.sql in your project’s SQL Editor, then retry.' : error.message; }
export async function fetchIntegrations() {
  if (!supabase) throw new Error('Configure Supabase before connecting a lead source.');
  const { data, error } = await supabase.from('crm_integrations').select('id,name,pixel_id,website_url,created_at').order('created_at', { ascending: false });
  if (error) throw new Error(connectionError(error));
  return data;
}
export async function saveIntegration({ name, pixel, website_url }, userId) {
  const pixel_id = parsePixelId(pixel);
  if (!name.trim()) throw new Error('Give this lead source a name.');
  let url = '';
  if (website_url.trim()) { try { const value = new URL(website_url.trim()); if (!['http:', 'https:'].includes(value.protocol)) throw new Error(); url = value.toString(); } catch { throw new Error('Enter a valid website URL beginning with https://.'); } }
  const { data, error } = await supabase.from('crm_integrations').upsert({ user_id: userId, name: name.trim(), pixel_id, website_url: url }, { onConflict: 'user_id,pixel_id' }).select('id,name,pixel_id,website_url,created_at').single();
  if (error) throw new Error(connectionError(error));
  return data;
}
export async function checkReceiver() {
  const endpoint = receiverUrl();
  if (!endpoint) throw new Error('Configure Supabase before checking the receiver.');
  let response;
  try {
    // Public health endpoint: no session or SDK headers, so no CORS preflight.
    response = await fetch(endpoint, { signal: AbortSignal.timeout(12000), credentials: 'omit' });
  } catch { throw new Error('Receiver unreachable.'); }
  if (response.status === 404) throw new Error('CRM lead receiver is not deployed in Supabase.');
  if (response.status === 401 || response.status === 403) throw new Error('Receiver gateway authentication is misconfigured.');
  const data = await response.json().catch(() => null);
  if (response.status === 503 && data?.ready === false) throw new Error('Receiver deployed; server configuration is incomplete.');
  if (!response.ok || data?.ready !== true) throw new Error(`Receiver check failed (HTTP ${response.status}). Connection unavailable.`);
  return data;
}
