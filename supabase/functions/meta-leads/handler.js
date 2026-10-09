import { createLeadHandler } from "../lead-ingest/handler.js";
const json = (body, status = 200) => Response.json(body, { status });
export function createMetaHandler({ env, fetch }) {
  const ingest = createLeadHandler({ env, fetch });
  return async (request) => {
    const url = new URL(request.url);
    if (request.method === "GET") {
      const token = env("META_VERIFY_TOKEN");
      return token &&
        url.searchParams.get("hub.mode") === "subscribe" &&
        url.searchParams.get("hub.verify_token") === token
        ? new Response(url.searchParams.get("hub.challenge") || "")
        : json({ error: "Verification rejected." }, 403);
    }
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const secret = env("META_APP_SECRET"),
      page = env("META_PAGE_ID"),
      token = env("META_PAGE_ACCESS_TOKEN"),
      version = env("META_GRAPH_VERSION");
    if (!secret || !page || !token || !/^v\d+\.\d+$/.test(version || ""))
      return json({ error: "Meta connection is not configured." }, 503);
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "Body required." }, 400);
      const chunks = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 262144) {
          await reader.cancel();
          return json({ error: "Body too large." }, 413);
        }
        chunks.push(value);
      }
      const raw = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        raw.set(chunk, offset);
        offset += chunk.length;
      }
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, raw));
      const supplied = request.headers.get("x-hub-signature-256") || "";
      if (!/^sha256=[a-f0-9]{64}$/.test(supplied))
        return json({ error: "Invalid signature." }, 401);
      let difference = 0;
      for (let i = 0; i < 32; i++)
        difference |= signature[i] ^ parseInt(supplied.slice(7 + i * 2, 9 + i * 2), 16);
      if (difference) return json({ error: "Invalid signature." }, 401);
      const body = JSON.parse(new TextDecoder().decode(raw));
      if (body.object !== "page") return json({ received: true });
      for (const entry of body.entry || []) {
        if (String(entry.id) !== page) continue;
        for (const change of entry.changes || []) {
          if (change.field !== "leadgen") continue;
          const id = String(change.value?.leadgen_id || "");
          if (!/^\d+$/.test(id)) return json({ error: "Invalid lead identifier." }, 400);
          const result = await fetch(
            `https://graph.facebook.com/${version}/${id}?fields=id,field_data,form_id,created_time`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(10000),
            },
          );
          if (!result.ok)
            return json(
              { error: "Meta lead retrieval failed. Check Page permissions and token." },
              502,
            );
          const lead = await result.json(),
            fields = {};
          for (const field of lead.field_data || [])
            fields[field.name] = (field.values || []).join(", ");
          const name =
            fields.full_name ||
            [fields.first_name, fields.last_name].filter(Boolean).join(" ");
          const saved = await ingest(
            new Request("https://internal/lead-ingest", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env("LEAD_INGEST_SECRET")}`,
              },
              body: JSON.stringify({
                name,
                phone: fields.phone_number,
                email: fields.email,
                answers: {
                  ...fields,
                  meta_lead_id: id,
                  meta_form_id: String(lead.form_id || ""),
                },
                source: "Meta Lead Ads",
              }),
            }),
          );
          if (!saved.ok)
            return json(
              { error: "CRM delivery failed. Meta can retry this notification." },
              502,
            );
        }
      }
      return json({ received: true });
    } catch {
      return json({ error: "Webhook processing failed. Retry delivery." }, 502);
    }
  };
}
