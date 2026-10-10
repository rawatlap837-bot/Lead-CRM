import test from "node:test";
import assert from "node:assert/strict";
import { createLeadHandler } from "../supabase/functions/lead-ingest/handler.js";
import { createMetaHandler } from "../supabase/functions/meta-leads/handler.js";
const secrets = {
  SUPABASE_URL: "https://example.supabase.co",
  CRM_DATABASE_KEY: "server-key",
  LEAD_INGEST_SECRET: "x".repeat(40),
  META_APP_SECRET: "app-secret",
  META_PAGE_ID: "123",
  META_PAGE_ACCESS_TOKEN: "page-token",
  META_GRAPH_VERSION: "v99.0",
  META_VERIFY_TOKEN: "verify",
};
const env = (key) => secrets[key];
test("receiver preflight succeeds before setup and all health/auth responses include CORS", async () => {
  const handler = createLeadHandler({
    env: () => undefined,
    fetch: () => {
      throw new Error("No database request expected");
    },
  });
  const preflight = await handler(
    new Request("https://receiver", {
      method: "OPTIONS",
      headers: { Origin: "http://127.0.0.1:5174" },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  assert.match(preflight.headers.get("access-control-allow-headers"), /authorization/);
  const health = await handler(new Request("https://receiver"));
  assert.equal(health.status, 503);
  assert.equal(health.headers.get("access-control-allow-origin"), "*");
  const configured = createLeadHandler({
    env,
    fetch: () => {
      throw new Error("Must not insert");
    },
  });
  const denied = await configured(new Request("https://receiver", { method: "POST" }));
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("access-control-allow-origin"), "*");
});
test("Website delivery authenticates, validates, and preserves existing leads on retry", async () => {
  let calls = 0;
  const handler = createLeadHandler({
    env,
    fetch: async (url, options) => {
      calls++;
      assert.match(url, /on_conflict=phone/);
      assert.match(options.headers.Prefer, /ignore-duplicates/);
      const lead = JSON.parse(options.body);
      assert.equal(lead.status, "new");
      assert.equal(lead.phone, "+919876543210");
      return Response.json(calls === 1 ? [{ id: "saved" }] : []);
    },
  });
  const request = (authorized = true, phone = "+91 98765 43210") =>
    new Request("https://receiver", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorized ? { Authorization: `Bearer ${secrets.LEAD_INGEST_SECRET}` } : {}),
      },
      body: JSON.stringify({
        name: "Test",
        phone,
        answers: { role: "owner" },
        status: "converted",
      }),
    });
  assert.equal((await handler(request(false))).status, 401);
  assert.equal((await handler(request(true, "invalid"))).status, 400);
  assert.equal((await handler(request())).status, 201);
  assert.deepEqual(await (await handler(request())).json(), {
    success: true,
    created: false,
  });
  assert.equal(calls, 2);
});
test("Google Sheets delivery resolves its owner and inserts only into that personal workspace", async () => {
  const token = "s".repeat(64);
  const owner = "00000000-0000-0000-0000-000000000001";
  const sheetEnv = (key) => secrets[key];
  let inserted;
  const handler = createLeadHandler({
    env: sheetEnv,
    fetch: async (url, options) => {
      if (url.includes("crm_sheet_connection_owner")) {
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
          ),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
        assert.equal(JSON.parse(options.body).token_hash, hash);
        assert.equal(options.headers.Authorization, "Bearer server-key");
        return Response.json(owner);
      }
      inserted = { url, options };
      return Response.json([{ id: "saved" }]);
    },
  });
  const response = await handler(
    new Request("https://receiver/functions/v1/lead-ingest/sheet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: "public-anon-key",
      },
      body: JSON.stringify({
        name: "Sheet lead",
        phone: "+919876543210",
        source: "Another user's data",
      }),
    }),
  );
  assert.equal(response.status, 201);
  assert.equal(inserted.options.headers.Authorization, "Bearer server-key");
  assert.equal(inserted.options.headers.apikey, "server-key");
  assert.equal(JSON.parse(inserted.options.body).source, `Personal leads / ${owner}`);
});
test("Meta verifies subscription and raw signature before retrieving and saving contacts", async () => {
  let calls = 0;
  const handler = createMetaHandler({
    env,
    fetch: async (url, options) => {
      calls++;
      if (url.includes("graph.facebook")) {
        assert.equal(options.headers.Authorization, "Bearer page-token");
        return Response.json({
          form_id: "42",
          field_data: [
            { name: "full_name", values: ["Meta Test"] },
            { name: "phone_number", values: ["+919876543210"] },
          ],
        });
      }
      const lead = JSON.parse(options.body);
      assert.equal(lead.source, "Meta Lead Ads");
      assert.equal(lead.answers.meta_lead_id, "456");
      return Response.json([{ id: "saved" }]);
    },
  });
  assert.equal(
    await (
      await handler(
        new Request(
          "https://receiver?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=challenge",
        ),
      )
    ).text(),
    "challenge",
  );
  const raw = JSON.stringify({
    object: "page",
    entry: [{ id: "123", changes: [{ field: "leadgen", value: { leadgen_id: "456" } }] }],
  });
  const request = (signature) =>
    new Request("https://receiver", {
      method: "POST",
      headers: { "x-hub-signature-256": signature },
      body: raw,
    });
  assert.equal((await handler(request("sha256=" + "0".repeat(64)))).status, 401);
  assert.equal(calls, 0);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secrets.META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)),
  );
  const signature =
    "sha256=" + Array.from(signed, (byte) => byte.toString(16).padStart(2, "0")).join("");
  assert.equal((await handler(request(signature))).status, 200);
  assert.equal(calls, 2);
});
