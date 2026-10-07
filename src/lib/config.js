export function normalizeSupabaseUrl(value) {
  if (!value) return "";
  const url = new URL(value.trim());
  if (/^\/(rest|auth)\/v1\/?$/.test(url.pathname)) url.pathname = "/";
  return url.toString().replace(/\/$/, "");
}
