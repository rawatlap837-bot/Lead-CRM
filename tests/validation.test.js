import { test } from "node:test";
import assert from "node:assert/strict";
import { validDate, validateFollowup, validateLead } from "../src/lib/validation.js";
test("invalid calendar dates and empty dates are rejected", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate(""), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-2-09"), false);
});
test("follow-ups require real connected and reconnect dates, a nonblank note, and a nonpast reconnect", () => {
  const valid = {
    description: "Call back",
    connected_on: "2026-10-05",
    reconnect_on: "2026-10-07",
  };
  assert.equal(validateFollowup(valid, "2026-10-07"), "");
  assert.match(
    validateFollowup({ ...valid, connected_on: "" }, "2026-10-07"),
    /connected/,
  );
  assert.match(
    validateFollowup({ ...valid, reconnect_on: "2026-10-06" }, "2026-10-07"),
    /today/,
  );
  assert.match(validateFollowup({ ...valid, description: " " }, "2026-10-07"), /note/);
});
test("manual lead form validates names, phone format, emails and statuses", () => {
  const valid = {
    name: "Lead",
    phone: "+919876543210",
    email: "lead@example.com",
    status: "new",
  };
  assert.equal(validateLead(valid), "");
  assert.match(validateLead({ ...valid, phone: "123 abc" }), /phone/);
  assert.match(validateLead({ ...valid, email: "bad" }), /email/);
  assert.match(validateLead({ ...valid, status: "unknown" }), /status/);
});
