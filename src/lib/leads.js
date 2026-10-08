import { supabase } from "./supabase";
import { rangeFor, todayIST } from "./dates";
import { validDate, validateFollowup } from "./validation";
export const STATUSES = ["new", "contacted", "follow-up", "converted", "lost"];
export const statusLabel = (value) =>
  ({
    new: "New",
    contacted: "Contacted",
    "follow-up": "Follow-up",
    converted: "Converted",
    lost: "Lost",
  })[value] || value;
function client() {
  if (!supabase)
    throw new Error(
      "Add your Supabase URL and anon key to .env, then restart the app.",
    );
  return supabase;
}
async function result(query) {
  const { data, error, count } = await query;
  if (error)
    throw new Error(
      error.code === "23505"
        ? "A lead with this phone number already exists."
        : error.message,
    );
  return { data, count };
}
function leadQuery(filters = {}) {
  let query = client().from("leads").select("*", { count: "exact" });
  if (filters.search) {
    const safe = filters.search.replace(/[%_(),"\\]/g, " ").trim();
    if (safe)
      query = query.or(
        `name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`,
      );
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  return query.order("created_at", { ascending: false }).order("id");
}
export async function fetchLeads({ page = 0, ...filters } = {}) {
  return result(leadQuery(filters).range(page * 25, page * 25 + 24));
}
export async function fetchLeadSources() {
  const sources = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data } = await result(
      client()
        .from("leads")
        .select("source")
        .not("source", "is", null)
        .order("source")
        .range(offset, offset + 999),
    );
    data.forEach((lead) => {
      const source = typeof lead.source === "string" ? lead.source.trim() : "";
      if (source) sources.add(source);
    });
    if (data.length < 1000) break;
  }
  return [...sources].sort((a, b) => a.localeCompare(b));
}
export async function fetchLeadSourceStats() {
  const stats = {};
  for (let offset = 0; ; offset += 1000) {
    const { data } = await result(
      client()
        .from("leads")
        .select("source,status")
        .range(offset, offset + 999),
    );
    data.forEach(({ source, status }) => {
      const name = typeof source === "string" ? source.trim() : "";
      const key = name || "__unassigned__";
      stats[key] ??= { total: 0, new: 0, converted: 0 };
      stats[key].total++;
      if (status === "new") stats[key].new++;
      if (status === "converted") stats[key].converted++;
    });
    if (data.length < 1000) break;
  }
  return stats;
}
export async function fetchLead(id) {
  return (
    await result(client().from("leads").select("*").eq("id", id).single())
  ).data;
}
export async function saveLead(values, id) {
  const query = id
    ? client().from("leads").update(values).eq("id", id)
    : client().from("leads").insert(values);
  return (await result(query.select().single())).data;
}
export async function changeStatus(id, status) {
  await result(
    client()
      .from("leads")
      .update({ status })
      .eq("id", id)
      .select("id")
      .single(),
  );
}
export async function deleteLead(id) {
  await result(
    client().from("leads").delete().eq("id", id).select("id").single(),
  );
}
export async function fetchFollowups(leadId) {
  let query = client()
    .from("followups")
    .select("*, leads(id,name,phone,email)")
    .order("reconnect_on", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id");
  if (leadId) query = query.eq("lead_id", leadId);
  const all = [];
  for (let offset = 0; ; offset += 1000) {
    const { data } = await result(query.range(offset, offset + 999));
    all.push(...data);
    if (data.length < 1000) break;
  }
  return leadId
    ? all.sort((a, b) => b.created_at.localeCompare(a.created_at))
    : all;
}
export async function markDone(id) {
  await result(
    client()
      .from("followups")
      .update({ status: "done" })
      .eq("id", id)
      .select("id")
      .single(),
  );
}
export async function addFollowup(values) {
  if (!values.description?.trim())
    throw new Error("Please enter a follow-up note.");
  if (!values.reconnect_on || values.reconnect_on < todayIST())
    throw new Error("Reconnect date must be today or later.");
  const validation = validateFollowup(values);
  if (validation) throw new Error(validation);
  const row = (
    await result(
      client()
        .from("followups")
        .insert({
          ...values,
          description: values.description.trim(),
          status: "pending",
        })
        .select()
        .single(),
    )
  ).data;
  try {
    await changeStatus(values.lead_id, "follow-up");
  } catch (error) {
    throw new Error(
      `Follow-up saved, but the lead status could not be changed: ${error.message}`,
    );
  }
  return row;
}
export async function rescheduleFollowup(previous, values) {
  await addFollowup({ ...values, lead_id: previous.lead_id });
  try {
    await markDone(previous.id);
  } catch (error) {
    throw new Error(
      `New follow-up saved, but the original could not be marked done: ${error.message}`,
    );
  }
}
export async function fetchReport(range) {
  const all = [];
  for (let offset = 0; ; offset += 1000) {
    const { data } = await result(
      client()
        .from("leads")
        .select("*")
        .gte("created_at", range.from)
        .lt("created_at", range.to)
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 999),
    );
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}
export function followupGroup(item, today = todayIST()) {
  if (item.status !== "done" && !validDate(item.reconnect_on))
    return "unscheduled";
  return item.status === "done"
    ? "done"
    : item.reconnect_on < today
      ? "overdue"
      : item.reconnect_on === today
        ? "today"
        : item.reconnect_on > today
          ? "upcoming"
          : "unscheduled";
}
export async function fetchDashboard() {
  const today = todayIST(),
    range = rangeFor("day", today);
  const count = (query) => result(query).then((r) => r.count ?? 0);
  const leadCount = () =>
    client().from("leads").select("id", { head: true, count: "exact" });
  const followCount = () =>
    client()
      .from("followups")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending");
  const [total, newToday, due, overdue, converted, recent, dueList] =
    await Promise.all([
      count(leadCount()),
      count(
        leadCount().gte("created_at", range.from).lt("created_at", range.to),
      ),
      count(followCount().eq("reconnect_on", today)),
      count(followCount().lt("reconnect_on", today)),
      count(leadCount().eq("status", "converted")),
      result(
        client()
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
      ),
      result(
        client()
          .from("followups")
          .select("*, leads(id,name,phone,email)")
          .eq("status", "pending")
          .eq("reconnect_on", today)
          .order("reconnect_on")
          .order("created_at")
          .limit(5),
      ),
    ]);
  return {
    total,
    newToday,
    due,
    overdue,
    converted,
    recent: recent.data,
    dueList: dueList.data,
  };
}
