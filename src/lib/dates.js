import {
  addDays,
  addMonths,
  addYears,
  format,
  isValid,
  parseISO,
  startOfWeek,
} from "date-fns";
export const TIMEZONE = "Asia/Kolkata";
export function todayIST(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
// Date-only values are parsed at local noon for calendar arithmetic, never as UTC instants.
function calendar(value) {
  return parseISO(`${value.slice(0, 10)}T12:00:00`);
}
function key(date) {
  return format(date, "yyyy-MM-dd");
}
export function weekStart(value = todayIST()) {
  return key(startOfWeek(calendar(value), { weekStartsOn: 1 }));
}
export function rangeFor(period, value = todayIST()) {
  let start = value.slice(0, 10),
    end;
  if (period === "week") {
    start = weekStart(start);
    end = key(addDays(calendar(start), 7));
  } else if (period === "month") {
    start = `${value.slice(0, 7)}-01`;
    end = key(addMonths(calendar(start), 1));
  } else if (period === "year") {
    start = `${value.slice(0, 4)}-01-01`;
    end = key(addYears(calendar(start), 1));
  } else {
    end = key(addDays(calendar(start), 1));
  }
  return {
    start,
    end,
    from: midnightInZone(start),
    to: midnightInZone(end),
    label: `${displayDate(start)} – ${displayDate(key(addDays(calendar(end), -1)))}`,
  };
}
function midnightInZone(value) {
  const utc = Date.parse(`${value}T00:00:00Z`);
  let result = utc;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(result));
    const get = (t) => parts.find((p) => p.type === t).value;
    const wall = Date.parse(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
    );
    result += utc - wall;
  }
  return new Date(result).toISOString();
}
export function displayDate(value) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = calendar(value);
    return isValid(date) ? format(date, "dd MMM yyyy") : "—";
  }
  const date = new Date(value);
  if (!isValid(date)) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  return ["day", "month", "year"]
    .map((type) => parts.find((p) => p.type === type).value)
    .join(" ");
}
export function weekInput(value) {
  const date = calendar(value);
  return format(date, "RRRR-'W'II");
}
export function dateFromWeek(value) {
  const [year, week] = value.split("-W").map(Number);
  return key(
    addDays(
      startOfWeek(calendar(`${year}-01-04`), { weekStartsOn: 1 }),
      (week - 1) * 7,
    ),
  );
}
