import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";
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
let integrationMissing = true,
  integrationWrites = 0;
let receiverChecks = 0;
let recoveryRequests = 0;
let importedRows = [];
let savedLead = null;
const pageLabels = new Map();
const h = React.createElement;
const originalBroadcastChannel = globalThis.BroadcastChannel;
const auth = {
  session: { user: { email: "test@example.com" } },
  loading: false,
  error: "",
  access: { is_admin: true, sources: [] },
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
    if (url.pathname.endsWith("/functions/v1/super-worker")) {
      receiverChecks++;
      assert.equal(req.headers.authorization, undefined);
      assert.equal(req.headers.apikey, undefined);
      assert.equal(req.method, "GET");
      res.statusCode = 404;
      res.end(
        JSON.stringify({
          code: "NOT_FOUND",
          message: "Requested function was not found",
        }),
      );
      return;
    }
    if (url.pathname.endsWith("/crm_page_labels")) {
      if (req.method === "POST") {
        let body = "";
        for await (const chunk of req) body += chunk;
        const label = JSON.parse(body);
        pageLabels.set(label.source, label.name);
      }
      res.end(
        JSON.stringify([...pageLabels].map(([source, name]) => ({ source, name }))),
      );
      return;
    }
    if (url.pathname.endsWith("/crm_import_rows")) {
      if (req.method === "POST") {
        let body = "";
        for await (const chunk of req) body += chunk;
        importedRows = JSON.parse(body);
      }
      res.end("[]");
      return;
    }
    if (url.pathname.endsWith("/crm_page_members")) {
      res.end("[]");
      return;
    }
    if (url.pathname.endsWith("/crm_integrations")) {
      if (req.method === "POST") integrationWrites++;
      res.statusCode = integrationMissing ? 404 : 200;
      res.end(
        JSON.stringify(
          integrationMissing ? { code: "PGRST205", message: "Missing table" } : [],
        ),
      );
      return;
    }
    if (url.pathname.endsWith("/recover")) {
      let body = "";
      for await (const chunk of req) body += chunk;
      assert.equal(JSON.parse(body).email, "crewcreative98@gmail.com");
      assert.equal(
        url.searchParams.get("redirect_to"),
        "http://127.0.0.1:5174/reset-password",
      );
      recoveryRequests++;
      res.end("{}");
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
    if (req.method === "POST" && url.pathname.endsWith("/leads")) {
      let body = "";
      for await (const chunk of req) body += chunk;
      savedLead = JSON.parse(body);
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
      JSON.stringify(req.headers.accept?.includes("vnd.pgrst.object") ? row : [row]),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.VITE_SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.VITE_SUPABASE_ANON_KEY = "local-ui-fixture";
  vite = await createServer({
    configFile: false,
    plugins: [reactPlugin()],
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
          replacement: resolve("node_modules/react-router/dist/development/index.mjs"),
        },
      ],
    },
    cacheDir: "node_modules/.vite-ui-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: "custom",
    logLevel: "error",
  });
  ({ MemoryRouter, Routes, Route } = await vite.ssrLoadModule("react-router-dom"));
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
  pageLabels.clear();
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
  assert.ok(document.querySelector('input[type="email"]'));
  assert.ok(document.querySelector('input[type="password"]'));
  assert.equal(button("Email me a sign-in link"), undefined);
  assert.doesNotMatch(document.body.textContent, /Open local CRM/);
  assert.deepEqual(Object.keys(modules.AuthProvider), ["AuthProvider"]);
  assert.deepEqual(Object.keys(modules.ToastProvider), ["ToastProvider"]);
});
test("the actual application mounts its providers and routes to login without crashing", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(h(modules.App.default)));
  await settle(() => document.body.textContent.includes("Sign in to your workspace"));
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
test("new users without shared pages can enter the workspace", async () => {
  await mount(
    h(
      Routes,
      null,
      h(
        Route,
        { element: h(modules.ProtectedRoute.default) },
        h(Route, { path: "/", element: h("p", null, "Empty workspace") }),
      ),
    ),
    {
      session: {
        ...auth,
        access: { is_admin: false, sources: [] },
        accessLoading: false,
        accessError: "",
      },
    },
  );
  assert.match(document.body.textContent, /Empty workspace/);
  assert.doesNotMatch(document.body.textContent, /Workspace access required/);
});

test("workspace access errors still block entry", async () => {
  await mount(
    h(
      Routes,
      null,
      h(
        Route,
        { element: h(modules.ProtectedRoute.default) },
        h(Route, { path: "/", element: h("p", null, "Private workspace") }),
      ),
    ),
    {
      session: {
        ...auth,
        access: null,
        accessLoading: false,
        accessError: "Could not verify workspace access.",
      },
    },
  );
  assert.match(document.body.textContent, /Could not verify workspace access/);
  assert.doesNotMatch(document.body.textContent, /Private workspace/);
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
    document.querySelectorAll("table.responsive-table tbody td[data-label]").length,
    8,
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
  assert.equal(document.querySelector('[aria-label="Select week"]').type, "date");
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
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
  assert.equal(saves, 1);
  assert.equal(document.querySelector('[aria-label="Close dialog"]').disabled, true);
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

test("admin sees sharing controls and receiver uses public GET", async () => {
  receiverChecks = 0;
  await mount(h(modules.Integrations.default), { path: "/integrations" });
  await settle(() => document.body.textContent.includes("Send invitation"));
  assert.match(document.body.textContent, /Admin panel/);
  await act(async () => button("Check receiver").click());
  await settle(() =>
    document.body.textContent.includes("CRM lead receiver is not deployed"),
  );
  assert.equal(receiverChecks, 1);
});
test("members cannot see connection or sharing controls", async () => {
  await mount(h(modules.Integrations.default), {
    session: { ...auth, access: { is_admin: false, sources: ["Website"] } },
  });
  await settle(() => document.body.textContent.includes("Open this page"));
  assert.match(document.body.textContent, /My landing pages/);
  assert.equal(button("Send invitation"), undefined);
  assert.equal(button("Prepare my connection"), undefined);
});

test("password recovery validates email and sends a reset request", async () => {
  await mount(h(modules.Login.default), {
    session: { session: null, loading: false, error: "" },
    path: "/login",
  });
  await act(async () => button("Forgot password").click());
  assert.match(document.body.textContent, /Enter your email address first/);
  const input = document.querySelector('input[type="email"]');
  await act(async () => {
    const props = input[Object.keys(input).find((key) => key.startsWith("__reactProps"))];
    props.onChange({ target: { value: "crewcreative98@gmail.com" } });
  });
  await act(async () => button("Forgot password").click());
  await settle(() => document.body.textContent.includes("If an account exists"));
  assert.equal(recoveryRequests, 1);
});

test("lead rows are numbered and page size is selectable", async () => {
  await mount(h(modules.Leads.default));
  await settle(() => document.querySelector('td[data-label="No."]'));
  assert.equal(document.querySelector('td[data-label="No."]').textContent, "1");
  const select = document.querySelector('[aria-label="Leads per page"]');
  assert.deepEqual(
    [...select.options].map((x) => x.value),
    ["10", "25", "50", "100"],
  );
  await act(async () => {
    select.value = "50";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  assert.equal(select.value, "50");
});

test("Google login requests OAuth with the current app redirect", async () => {
  const { supabase } = await vite.ssrLoadModule("/src/lib/supabase.js");
  const original = supabase.auth.signInWithOAuth;
  let requested;
  supabase.auth.signInWithOAuth = async (options) => {
    requested = options;
    return { error: null };
  };
  try {
    await mount(h(modules.Login.default), {
      session: { session: null, loading: false, error: "" },
    });
    await act(async () => button("Continue with Google").click());
    assert.equal(requested.provider, "google");
    assert.equal(requested.options.redirectTo, "http://127.0.0.1:5174/");
  } finally {
    supabase.auth.signInWithOAuth = original;
  }
});
test("administrators can access page renaming", async () => {
  await mount(h(modules.Integrations.default));
  await settle(() => button("Rename page"));
  assert.ok(button("Rename page"));
});

test("members can rename an allowed lead tab without changing its source", async () => {
  await mount(h(modules.Leads.default), {
    path: "/leads?source=Website",
    session: { ...auth, access: { is_admin: false, sources: ["Website"] } },
  });
  await settle(() => button("Rename page"));
  await act(async () => button("Rename page").click());
  const input = document.querySelector('form input[maxlength="200"]');
  await act(async () => {
    const props = input[Object.keys(input).find((key) => key.startsWith("__reactProps"))];
    props.onChange({ target: { value: "Digital Marketing" } });
  });
  await act(async () =>
    document
      .querySelector("form")
      .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })),
  );
  await settle(() =>
    [...document.querySelectorAll('[role="tab"]')].some((tab) =>
      tab.textContent.includes("Digital Marketing"),
    ),
  );
  assert.equal(pageLabels.get("Website"), "Digital Marketing");
  const selected = document.querySelector('[role="tab"][aria-selected="true"]');
  assert.match(selected.textContent, /Digital Marketing/);
  assert.ok(button("Rename page"));
});

test("members do not see rename controls for unshared lead tabs", async () => {
  await mount(h(modules.Leads.default), {
    path: "/leads?source=Unshared",
    session: { ...auth, access: { is_admin: false, sources: ["Website"] } },
  });
  await settle(() => document.querySelector("tbody td"));
  assert.equal(button("Rename page"), undefined);
});

test("new users can add leads in their personal workspace without shared pages", async () => {
  await mount(h(modules.Leads.default), {
    path: "/leads?add=1",
    session: {
      ...auth,
      session: { user: { id: "normal-user", email: "normal@example.com" } },
      access: { is_admin: false, sources: [] },
    },
  });
  await settle(() => document.querySelector("tbody td"));
  assert.ok(button("Add lead"));
  assert.ok(button("Import Excel"));
  assert.ok(document.querySelector('[role="dialog"]'));
  const source = document.querySelector('select[name="source"]');
  assert.equal(source.value, "Personal leads / normal-user");
  assert.equal(source.selectedOptions[0].textContent, "My leads");
  await act(async () => {
    for (const [name, value] of Object.entries({
      name: "Personal contact",
      phone: "+919876543210",
    })) {
      const input = document.querySelector(`input[name="${name}"]`);
      const props =
        input[Object.keys(input).find((key) => key.startsWith("__reactProps"))];
      props.onChange({ target: { name, value } });
    }
  });
  await act(async () =>
    document
      .querySelector('[role="dialog"] form')
      .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })),
  );
  await settle(() => !document.querySelector('[role="dialog"]'));
  assert.equal(savedLead.source, "Personal leads / normal-user");
  assert.equal(savedLead.name, "Personal contact");
});

test("normal users can import Excel into their personal workspace", async () => {
  await mount(h(modules.Leads.default), {
    session: {
      ...auth,
      session: { user: { id: "normal-user", email: "normal@example.com" } },
      access: { is_admin: false, sources: [] },
    },
  });
  await act(async () => button("Import Excel").click());
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Name", "Phone"],
      ["Test lead", "1234567890"],
    ]),
    "Leads",
  );
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const fileInput = document.querySelector('input[type="file"]');
  await act(async () => {
    const props =
      fileInput[Object.keys(fileInput).find((key) => key.startsWith("__reactProps"))];
    await props.onChange({
      target: {
        files: [
          { name: "leads.xlsx", size: bytes.byteLength, arrayBuffer: async () => bytes },
        ],
      },
    });
  });
  await settle(() => button("Upload 2 rows"));
  await act(async () => button("Upload 2 rows").click());
  await settle(() => document.body.textContent.includes("rows uploaded into My leads"));
  assert.equal(importedRows.length, 2);
  assert.ok(importedRows.every((row) => row.source === "Personal leads / normal-user"));
});

test("a shared page with no leads still appears in landing pages", async () => {
  await mount(h(modules.Integrations.default), {
    session: { ...auth, access: { is_admin: false, sources: ["Empty campaign"] } },
  });
  await settle(() => document.body.textContent.includes("Empty campaign"));
  const card = [...document.querySelectorAll("article")].find((item) =>
    item.textContent.includes("Empty campaign"),
  );
  assert.ok(card);
  assert.match(card.textContent, /0Total/);
  assert.ok(card.querySelector('a[href="/leads?source=Empty%20campaign"]'));
});

test("password visibility can be toggled without losing the value", async () => {
  await mount(h(modules.Login.default), {
    session: { session: null, loading: false, error: "" },
  });
  const password = document.querySelector('input[type="password"]');
  await act(async () => {
    const props =
      password[Object.keys(password).find((key) => key.startsWith("__reactProps"))];
    props.onChange({ target: { value: "example-password" } });
  });
  await act(async () => document.querySelector('input[type="checkbox"]').click());
  assert.equal(password.type, "text");
  assert.equal(password.value, "example-password");
  await act(async () => document.querySelector('input[type="checkbox"]').click());
  assert.equal(password.type, "password");
});

test("workspace shows an offline notice and clears it after reconnecting", async () => {
  const original = Object.getOwnPropertyDescriptor(window.navigator, "onLine");
  try {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });
    await mount(h(modules.Sidebar.default));
    assert.match(document.body.textContent, /You're offline/);
    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });
    await act(async () => window.dispatchEvent(new window.Event("online")));
    assert.doesNotMatch(document.body.textContent, /You're offline/);
  } finally {
    if (original) Object.defineProperty(window.navigator, "onLine", original);
    else delete window.navigator.onLine;
  }
});
