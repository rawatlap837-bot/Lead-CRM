import { supabase } from "./supabase";
// Display names are separate from source IDs, which Sheets and permissions use.
export async function fetchPageNames() {
  const { data, error } = await supabase.from("crm_page_labels").select("source,name");
  if (["42P01", "PGRST205"].includes(error?.code)) return {};
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.source, row.name]));
}
export async function setPageName(source, name) {
  if (!name.trim() || name.trim().length > 200)
    throw new Error("Enter a page name up to 200 characters.");
  const { error } = await supabase
    .from("crm_page_labels")
    .upsert({ source, name: name.trim() }, { onConflict: "source" });
  if (error)
    throw new Error(
      ["42P01", "PGRST205"].includes(error.code)
        ? "Run supabase/page-names.sql in Supabase SQL Editor first."
        : error.code === "42501"
          ? "Renaming is not enabled for this page. Ask your administrator to run the updated supabase/page-names.sql and check your page access."
          : error.message,
    );
}
