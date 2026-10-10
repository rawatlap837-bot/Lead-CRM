import { supabase } from "./supabase";

export async function fetchSectionSources() {
  const sources = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("crm_sections")
      .select("source")
      .order("source")
      .range(offset, offset + 999);
    if (["42P01", "PGRST205"].includes(error?.code)) return [];
    if (error) throw new Error(error.message);
    sources.push(...data.map((row) => row.source));
    if (data.length < 1000) return sources;
  }
}

export async function createSection(name) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 200)
    throw new Error("Enter a section name up to 200 characters.");
  const { data, error } = await supabase.rpc("crm_create_section", {
    section_name: trimmed,
  });
  if (error)
    throw new Error(
      ["42883", "PGRST202"].includes(error.code)
        ? "New sections need one-time setup. Run supabase/custom-sections.sql in Supabase SQL Editor."
        : error.message,
    );
  return data;
}

export async function deleteSection(source) {
  const { error } = await supabase.rpc("crm_delete_section", { page_source: source });
  if (error)
    throw new Error(
      ["42883", "PGRST202"].includes(error.code)
        ? "Run the updated supabase/custom-sections.sql in Supabase SQL Editor to enable deletion."
        : error.message,
    );
}
