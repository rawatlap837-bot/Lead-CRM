// The database derives this same key from auth.uid(). Users cannot claim another
// account's personal workspace by changing the value sent from the browser.
export function personalSource(userId) {
  return userId ? `Personal leads / ${userId}` : null;
}

export function sourceName(source, names = {}, ownSource = null) {
  if (names?.[source]) return names[source];
  if (source === ownSource) return "My leads";
  if (source?.startsWith("Personal leads / ")) {
    return `Personal leads (${source.slice(-8)})`;
  }
  return source || "Manual";
}
