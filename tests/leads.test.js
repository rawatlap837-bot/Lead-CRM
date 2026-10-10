import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createServer } from "vite";

// Exercise the real Supabase SDK against a disposable local HTTP fixture.
// No production credentials, network service or actual database writes are used.
let httpServer,
  vite,
  api,
  requests = [],
  failStatus = false;
const fixtures = Array.from({ length: 1001 }, (_, i) => ({
  id: `lead-${i}`,
  name: `Lead ${i}`,
  phone: `00${i}`,
  status: "new",
  created_at: "2026-10-05T05:00:00Z",
  answers: { Budget: i },
}));
before(async () => {
  httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let body = "";
    for await (const chunk of req) body += chunk;
    const values = body ? JSON.parse(body) : null;
    requests.push({ method: req.method, url, values, headers: req.headers });
    res.setHeader("Content-Type", "application/json");
    if (req.method === "PATCH" && url.pathname.endsWith("/leads") && failStatus) {
      res.statusCode = 403;
      res.end(JSON.stringify({ message: "Status update denied", code: "42501" }));
      return;
    }
    if (req.method === "POST" && values?.phone === "duplicate") {
      res.statusCode = 409;
      res.end(JSON.stringify({ code: "23505", message: "duplicate key" }));
      return;
    }
    if (req.method === "POST" || req.method === "PATCH") {
      res.end(JSON.stringify({ id: "saved-id", ...values }));
      return;
    }
    const offset = Number(url.searchParams.get("offset") || 0),
      limit = Number(url.searchParams.get("limit") || 1000);
    res.setHeader(
      "Content-Range",
      `${offset}-${Math.min(offset + limit - 1, 1000)}/1001`,
    );
    res.end(
      JSON.stringify(
        url.pathname.endsWith("/followups") ? [] : fixtures.slice(offset, offset + limit),
      ),
    );
  });
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  process.env.VITE_SUPABASE_URL = `http://127.0.0.1:${httpServer.address().port}`;
  process.env.VITE_SUPABASE_ANON_KEY = "local-test-anon";
  vite = await createServer({
    configLoader: "runner",
    server: { middlewareMode: true, hmr: false, ws: false },
    cacheDir: "node_modules/.vite-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: "custom",
    logLevel: "error",
  });
  api = await vite.ssrLoadModule("/src/lib/leads.js");
});
after(async () => {
  await vite?.close();
  await new Promise((resolve) => httpServer.close(resolve));
});
test("lead list uses 25-row server pagination, exact counts and sanitized search", async () => {
  requests = [];
  const result = await api.fetchLeads({
    page: 2,
    search: "Name,(email)",
    status: "new",
  });
  const request = requests[0];
  assert.equal(result.data.length, 25);
  assert.equal(result.count, 1001);
  assert.equal(request.url.searchParams.get("offset"), "50");
  assert.equal(request.url.searchParams.get("limit"), "25");
  assert.equal(request.url.searchParams.get("status"), "eq.new");
  assert.match(request.headers.prefer, /count=exact/);
  assert.equal(request.url.searchParams.get("or").split(",").length, 3);
});
test("reports fetch all 1001 rows with timezone boundaries in two batches", async () => {
  requests = [];
  const range = {
    from: "2026-10-04T18:30:00.000Z",
    to: "2026-10-05T18:30:00.000Z",
  };
  const rows = await api.fetchReport(range);
  assert.equal(rows.length, 1001);
  assert.equal(new Set(rows.map((row) => row.id)).size, 1001);
  assert.equal(requests.length, 2);
  assert.deepEqual(
    requests.map((r) => r.url.searchParams.get("offset")),
    ["0", "1000"],
  );
  assert.deepEqual(requests[0].url.searchParams.getAll("created_at"), [
    `gte.${range.from}`,
    `lt.${range.to}`,
  ]);
  assert.equal(requests[0].url.searchParams.get("order"), "created_at.desc,id.asc");
});
test("follow-up query includes the required lead join", async () => {
  requests = [];
  await api.fetchFollowups();
  assert.equal(
    requests[0].url.searchParams.get("select"),
    "*,leads(id,name,phone,email)",
  );
});
test("reschedule saves a new note, updates lead status, then completes original", async () => {
  requests = [];
  await api.rescheduleFollowup(
    { id: "original", lead_id: "lead-1" },
    {
      description: " New conversation ",
      connected_on: "2099-01-01",
      reconnect_on: "2099-01-02",
    },
  );
  assert.deepEqual(
    requests.map((r) => r.method),
    ["POST", "PATCH", "PATCH"],
  );
  assert.equal(requests[0].values.status, "pending");
  assert.equal(requests[0].values.description, "New conversation");
  assert.equal(requests[1].values.status, "follow-up");
  assert.equal(requests[2].values.status, "done");
  assert.equal(requests[2].url.searchParams.get("id"), "eq.original");
});
test("partial follow-up save reports exactly what succeeded", async () => {
  requests = [];
  failStatus = true;
  try {
    await assert.rejects(
      api.addFollowup({
        lead_id: "lead-1",
        description: "Note",
        connected_on: "2099-01-01",
        reconnect_on: "2099-01-02",
      }),
      /Follow-up saved, but the lead status/,
    );
    assert.equal(requests.length, 2);
  } finally {
    failStatus = false;
  }
});
test("duplicate phones produce a friendly error and past reconnect dates make no request", async () => {
  await assert.rejects(
    api.saveLead({ name: "Duplicate", phone: "duplicate" }),
    /phone number already exists/,
  );
  requests = [];
  await assert.rejects(
    api.addFollowup({ description: "Old date", reconnect_on: "2000-01-01" }),
    /today or later/,
  );
  assert.equal(requests.length, 0);
});
