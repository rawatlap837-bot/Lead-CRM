import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSupabaseUrl } from "../src/lib/config.js";
test("REST and auth endpoint URLs normalize to project base URL", () => {
  assert.equal(
    normalizeSupabaseUrl("https://project.supabase.co/rest/v1/"),
    "https://project.supabase.co",
  );
  assert.equal(
    normalizeSupabaseUrl("https://project.supabase.co/auth/v1"),
    "https://project.supabase.co",
  );
  assert.equal(normalizeSupabaseUrl("http://localhost:54321"), "http://localhost:54321");
  assert.equal(normalizeSupabaseUrl(""), "");
  assert.throws(() => normalizeSupabaseUrl("invalid url"));
});
