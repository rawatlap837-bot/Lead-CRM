// Install in your LMS website, not in the Vite CRM. Requires Node.js 20+.
// Invoke from the existing form with { name, phone, email, answers }.
export async function POST(request) {
  const endpoint = process.env.CRM_LEAD_RECEIVER_URL;
  const secret = process.env.CRM_LEAD_INGEST_SECRET;
  if (!endpoint || !secret) return Response.json({ error: 'Lead delivery is not configured.' }, { status: 503 });
  // Reuse your site's form validation, CAPTCHA and rate limiting here.
  // This public route must have those controls before production use.
  try {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid form origin.' }, { status: 403 });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 65536) return Response.json({ error: 'Lead payload is too large.' }, { status: 413 });
    const payload = JSON.parse(raw);
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: payload.name, phone: payload.phone, email: payload.email, answers: payload.answers, source: 'LMS website' }), signal: AbortSignal.timeout(12000) });
    return Response.json(await response.json(), { status: response.status });
  } catch { return Response.json({ error: 'Could not deliver the lead. Please retry.' }, { status: 502 }); }
}
