import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

let vite,
  server,
  dom,
  root,
  AuthContext,
  ToastContext,
  modules = {},
  followupDate;
let MemoryRouter, Routes, Route;
let integrationMissing = true, integrationWrites = 0;
const h = React.createElement;
const originalBroadcastChannel = globalThis.BroadcastChannel;
const auth = {
  session: { user: { email: "test@example.com" } },
  loading: false,
  error: "",
};
const lead = {
  id: "test-lead",
  name: "A very long lead name for a small mobile screen",
  email: "long.address@example.com",
  phone: "+919876543210",
  status: "new",
  source: "Website",
  answers: { Budget: "100" },
  created_at: new Date().toISOString(),
};
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5174",
    pretendToBeVisual: true,
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.BroadcastChannel = undefined;
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("Content-Type", "application/json");
    if (url.pathname.endsWith('/crm_integrations')) {
      if (req.method === 'POST') integrationWrites++;
      res.statusCode = integrationMissing ? 404 : 200;
      res.end(JSON.stringify(integrationMissing ? { code: 'PGRST205', message: 'Missing table' } : []));
      return;
    }
    if (url.pathname.endsWith("/token")) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          msg: "Invalid login credentials",
          error_code: "invalid_credentials",
        }),
      );
      return;
    }
    res.setHeader("Content-Range", "0-0/1");
    const isFollowup = url.pathname.endsWith("/followups");
    const followup = {
      id: "test-followup",
      lead_id: lead.id,
      description: "A conversation note",
      connected_on: followupDate,
      reconnect_on: followupDate,
      status: "pending",
      created_at: lead.created_at,
      leads: lead,
    };
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const row = isFollowup ? followup : lead;
    res.end(
      JSON.stringify(
        req.headers.accept?.includes("vnd.pgrst.object") ? row : [row],
      ),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.VITE_SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.VITE_SUPABASE_ANON_KEY = "local-ui-fixture";
  vite = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    ssr: { noExternal: ["react-router", "react-router-dom"] },
    resolve: {
      alias: [
        {
          find: /^react-router-dom$/,
          replacement: resolve("node_modules/react-router-dom/dist/index.mjs"),
        },
        {
          find: /^react-router\/dom$/,
          replacement: resolve(
            "node_modules/react-router/dist/development/dom-export.mjs",
          ),
        },
        {
          find: /^react-router$/,
          replacement: resolve(
            "node_modules/react-router/dist/development/index.mjs",
          ),
        },
      ],
    },
    cacheDir: "node_modules/.vite-ui-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: "custom",
    logLevel: "error",
  });
  ({ MemoryRouter, Routes, Route } =
    await vite.ssrLoadModule("react-router-dom"));
  ({ AuthContext } = await vite.ssrLoadModule("/src/context/auth-state.js"));
  ({ ToastContext } = await vite.ssrLoadModule("/src/context/toast-state.js"));
  followupDate = (await vite.ssrLoadModule("/src/lib/dates.js")).todayIST();
  for (const [name, path] of Object.entries({
    Login: "pages/Login.jsx",
    Leads: "pages/Leads.jsx",
    FollowUps: "pages/FollowUps.jsx",
    Reports: "pages/Reports.jsx",
    LeadDetail: "pages/LeadDetail.jsx",
    Dashboard: "pages/Dashboard.jsx",
    Integrations: "pages/Integrations.jsx",
    Sidebar: "components/Sidebar.jsx",
    ProtectedRoute: "components/ProtectedRoute.jsx",
    Modal: "components/Modal.jsx",
    Forms: "components/Forms.jsx",
    useLoad: "lib/useLoad.js",
    AuthProvider: "context/AuthContext.jsx",
    ToastProvider: "components/Toast.jsx",
    App: "App.jsx",
  }))
    modules[name] = await vite.ssrLoadModule(`/src/${path}`);
});
afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});
after(async () => {
  const { supabase } = await vite.ssrLoadModule("/src/lib/supabase.js");
  await supabase?.auth.stopAutoRefresh();
  await vite?.close();
  await new Promise((resolve) => server.close(resolve));
  dom?.window.close();
  globalThis.BroadcastChannel = originalBroadcastChannel;
});
async function mount(component, { session = auth, path = "/" } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      h(
        MemoryRouter,
        { initialEntries: [path] },
        h(
          AuthContext.Provider,
          { value: session },
          h(ToastContext.Provider, { value: () => {} }, component),
        ),
      ),
    ),
  );
}
async function settle(predicate) {
  for (let i = 0; i < 40; i++) {
    if (predicate()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
  assert.ok(predicate(), "Expected UI state did not appear");
}
function button(text) {
  return [...document.querySelectorAll("button")].find((el) =>
    el.textContent.includes(text),
  );
}

test("login renders with a real auth context and exposes no local access", async () => {
  await mount(h(modules.Login.default), {
    session: { session: null, loading: false, error: "" },
    path: "/login",
  });
  assert.match(document.body.textContent, /Sign in to your workspace/);
  assert.equal(document.querySelectorAll("input").length, 2);
  assert.doesNotMatch(document.body.textContent, /Open local CRM/);
  assert.deepEqual(Object.keys(modules.AuthProvider), ["AuthProvider"]);
  assert.deepEqual(Object.keys(modules.ToastProvider), ["ToastProvider"]);
});
test("the actual application mounts its providers and routes to login without crashing", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(h(modules.App.default)));
  await settle(() =>
    document.body.textContent.includes("Sign in to your workspace"),
  );
  assert.doesNotMatch(document.body.textContent, /reconnect your workspace/);
});
test("unauthenticated users are redirected away from CRM pages", async () => {
  await mount(
    h(
      Routes,
      null,
      h(Route, { path: "/login", element: h("p", null, "Login destination") }),
      h(
        Route,
        { element: h(modules.ProtectedRoute.default) },
        h(Route, { path: "/leads", element: h("p", null, "Private leads") }),
      ),
    ),
    { session: { session: null, loading: false }, path: "/leads" },
  );
  assert.match(document.body.textContent, /Login destination/);
  assert.doesNotMatch(document.body.textContent, /Private leads/);
});
test("mobile menu opens, locks scroll, closes with Escape and restores focus", async () => {
  await mount(h(modules.Sidebar.default));
  const menu = document.querySelector('[aria-label="Open navigation"]'),
    drawer = document.querySelector("aside");
  assert.equal(drawer.getAttribute("aria-hidden"), "true");
  assert.ok(drawer.hasAttribute("inert"));
  await act(async () => menu.click());
  assert.equal(drawer.getAttribute("aria-hidden"), "false");
  assert.equal(document.body.style.overflow, "hidden");
  await act(async () =>
    document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  assert.equal(drawer.getAttribute("aria-hidden"), "true");
  assert.equal(document.body.style.overflow, "");
  assert.equal(document.activeElement, menu);
});
test("lead records have mobile labels and the add modal opens from the dashboard link", async () => {
  await mount(h(modules.Leads.default), { path: "/leads?add=1" });
  await settle(() => document.querySelector("tbody td"));
  assert.equal(
    document.querySelectorAll("table.responsive-table tbody td[data-label]")
      .length,
    7,
  );
  assert.equal(
    document.querySelector('[role="dialog"]').getAttribute("aria-modal"),
    "true",
  );
  await act(async () =>
    document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  assert.equal(document.querySelector('[role="dialog"]'), null);
});
test("follow-ups and reports use labelled mobile records; week picker works as a date picker", async () => {
  await mount(h(modules.FollowUps.default));
  await settle(() => document.querySelector("tbody td"));
  assert.equal(document.querySelectorAll("tbody td[data-label]").length, 5);
  await act(async () => root.unmount());
  root = null;
  document.body.innerHTML = "";
  await mount(h(modules.Reports.default));
  await settle(() => document.querySelector("tbody td"));
  assert.equal(document.querySelectorAll("tbody td[data-label]").length, 7);
  await act(async () => button("week").click());
  assert.equal(
    document.querySelector('[aria-label="Select week"]').type,
    "date",
  );
});
test("modal cannot close during saving and double form submits cause only one save", async () => {
  let saves = 0,
    resolveSave,
    closed = 0;
  function Harness() {
    const [busy, setBusy] = React.useState(false);
    return h(
      modules.Modal.default,
      { title: "Edit", busy, onClose: () => closed++ },
      h(modules.Forms.LeadForm, {
        lead,
        onCancel: () => closed++,
        onBusyChange: setBusy,
        onSave: () => {
          saves++;
          return new Promise((resolve) => {
            resolveSave = resolve;
          });
        },
      }),
    );
  }
  await mount(h(Harness));
  await act(async () => {
    const form = document.querySelector("form");
    form.dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  assert.equal(saves, 1);
  assert.equal(
    document.querySelector('[aria-label="Close dialog"]').disabled,
    true,
  );
  await act(async () =>
    document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  assert.equal(closed, 0);
  await act(async () => resolveSave());
  await act(async () =>
    document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  assert.equal(closed, 1);
});
test("changing lead identity hides old data immediately and discards stale responses", async () => {
  const pending = {};
  function Harness({ id }) {
    const { data, loading } = modules.useLoad.default(
      () =>
        new Promise((resolve) => {
          pending[id] = resolve;
        }),
      [id],
    );
    return h("p", null, loading ? "Loading" : data);
  }
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const render = (id) =>
    h(ToastContext.Provider, { value: () => {} }, h(Harness, { id }));
  await act(async () => root.render(render("first")));
  await act(async () => pending.first("First lead"));
  assert.match(document.body.textContent, /First lead/);
  await act(async () => root.render(render("second")));
  assert.doesNotMatch(document.body.textContent, /First lead/);
  await act(async () => root.render(render("third")));
  await act(async () => pending.second("Stale lead"));
  assert.doesNotMatch(document.body.textContent, /Stale lead/);
  await act(async () => pending.third("Third lead"));
  assert.match(document.body.textContent, /Third lead/);
});

test('missing integration table shows SQL recovery and prevents writes until setup succeeds', async () => {
  integrationMissing = true;
  integrationWrites = 0;
  await mount(h(modules.Integrations.default), { path: '/integrations' });
  await settle(() => document.body.textContent.includes('One-time database setup needed'));
  assert.equal(button('Complete database setup to save').disabled, true);
  assert.match(document.querySelector('[aria-label="Database setup SQL"]').value, /create table if not exists public.crm_integrations/);
  assert.match(document.querySelector('[aria-label="Database setup SQL"]').value, /enable row level security/);
  assert.ok(document.querySelector('a[href="https://supabase.com/dashboard"]'));
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(integrationWrites, 0);
  integrationMissing = false;
  await act(async () => button('Check database setup').click());
  await settle(() => Boolean(button('Save Pixel configuration')));
  assert.equal(button('Save Pixel configuration').disabled, false);
  assert.equal(document.querySelector('[name="pixel"]').value, '1613294250158679');
  assert.doesNotMatch(document.body.textContent, /One-time database setup needed/);
});
