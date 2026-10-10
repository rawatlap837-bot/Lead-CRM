import { supabase } from "./supabase";

export const ACTIVITY_LIMIT = 100;

function checkError(error) {
  if (!error) return;
  if (["42P01", "PGRST205", "PGRST200"].includes(error.code)) {
    throw new Error(
      "Notifications need one-time setup. Run supabase/activity-notifications.sql in Supabase SQL Editor.",
    );
  }
  throw new Error(error.message);
}

export async function fetchActivity(userId) {
  const { data, error } = await supabase
    .from("crm_activity")
    .select(
      "id,source,section,message,entity_id,created_at,actor_id,crm_activity_reads(user_id)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ACTIVITY_LIMIT);
  checkError(error);
  return data.map((event) => ({
    ...event,
    read: (event.crm_activity_reads || []).some((read) => read.user_id === userId),
  }));
}

export async function acknowledgeActivity(userId, ids) {
  if (!ids.length) return;
  const { error } = await supabase.from("crm_activity_reads").upsert(
    [...new Set(ids)].map((event_id) => ({ event_id, user_id: userId })),
    { onConflict: "event_id,user_id", ignoreDuplicates: true },
  );
  checkError(error);
}

export function activitySections(event) {
  if (event.section === "leads") return ["/", "/leads", "/reports"];
  if (event.section === "followups") return ["/", "/followups"];
  return ["/", "/integrations", "/leads"];
}

export function activityDestination(event) {
  if (event.entity_id) return `/leads/${encodeURIComponent(event.entity_id)}`;
  const section = event.section === "integrations" ? "/integrations" : "/leads";
  return `${section}?source=${encodeURIComponent(event.source)}`;
}
