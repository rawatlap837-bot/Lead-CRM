import { test } from "node:test";
import assert from "node:assert/strict";
import {
  todayIST,
  rangeFor,
  displayDate,
  weekStart,
  weekInput,
  dateFromWeek,
} from "../src/lib/dates.js";
test("IST today changes at 18:30 UTC, independent of the host timezone", () => {
  assert.equal(todayIST(new Date("2026-10-04T18:29:59Z")), "2026-10-04");
  assert.equal(todayIST(new Date("2026-10-04T18:30:00Z")), "2026-10-05");
});
test("day ranges use IST midnights and exclusive upper boundary", () => {
  const range = rangeFor("day", "2026-10-05");
  assert.equal(range.from, "2026-10-04T18:30:00.000Z");
  assert.equal(range.to, "2026-10-05T18:30:00.000Z");
  assert.equal(displayDate("2026-10-04T18:30:00Z"), "05 Oct 2026");
});
test("Monday weeks, month and year boundaries", () => {
  assert.equal(weekStart("2026-10-11"), "2026-10-05");
  assert.equal(rangeFor("week", "2026-10-11").end, "2026-10-12");
  assert.equal(rangeFor("month", "2024-02-29").end, "2024-03-01");
  assert.equal(rangeFor("year", "2026-10-05").end, "2027-01-01");
  assert.equal(dateFromWeek("2026-W01"), "2025-12-29");
  assert.equal(weekInput("2025-12-29"), "2026-W01");
});
